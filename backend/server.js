const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


// 股票代號的合法形狀。yfinance 用到的字元就這些：英數、點（2330.TW）、
// 連字號（BRK-B）、以及指數前綴的插入符號（^TWII）。長度上限 15 綽綽有餘。
// 這個白名單是把使用者輸入交給子行程之前的最後一道，也是唯一一道防線。
const SYMBOL_RE = /^[A-Za-z0-9.^-]{1,15}$/;

// 這幾個上限的存在理由：/api/v1/stocks/trend 是不需要認證的，而只要查一個
// 資料庫裡還沒有的代號，它就會生一個 python3 子行程出來。合法形狀的代號有
// 幾千萬種組合（SYMBOL_RE 允許 1~15 個英數字元），攻擊者不必猜中任何真實
// 代號，只要一直換沒看過的字串，每一個都會落進「資料庫沒有 → 去爬」這條路。
// 每個子行程都要載入 pandas 與 yfinance，常駐記憶體是百 MB 等級的，幾十個
// 並行就足以把機器吃掉。
//
// 上限訂在 2 是保守值：這個爬蟲是背景補資料用的，慢一點沒關係，但它絕對
// 不該變成一個「一個 HTTP 請求換一個 Python 行程」的放大器。
const MAX_CONCURRENT_SCRAPES = 2;
// yfinance 會對外連線。沒有 timeout 的話，上游一卡住，子行程就永遠不會結束，
// 而 triggerScraper 是被 await 的——那條 HTTP 請求也跟著永遠掛在那裡。
const SCRAPER_TIMEOUT_MS = 20000;
// execFile 預設的 maxBuffer 是 1 MiB，這裡寫出來是為了讓它是一個明確的決定
// 而不是一個預設值。
const SCRAPER_MAX_BUFFER = 1024 * 1024;

let runningScrapes = 0;
// 同一個代號同時被查很多次時，只跑一次。這也擋掉「同一個代號重複請求」這種
// 最省力的放大手法。
const inFlightSymbols = new Set();

const triggerScraper = (symbol) => {
  return new Promise((resolve) => {
    // 白名單先擋。不合法就直接不跑爬蟲——這個參數會進到子行程，寧可少一筆
    // 資料也不要把沒驗證過的字串往下送。
    if (typeof symbol !== 'string' || !SYMBOL_RE.test(symbol)) {
      console.warn(`Rejected scraper symbol (failed whitelist): ${JSON.stringify(symbol)}`);
      resolve('');
      return;
    }

    if (inFlightSymbols.has(symbol)) {
      resolve('');
      return;
    }

    if (runningScrapes >= MAX_CONCURRENT_SCRAPES) {
      // 刻意不排隊：排隊只是把記憶體壓力換成無上限的等待佇列，而呼叫端要的
      // 只是「資料庫裡有什麼就回什麼」。直接放棄這次補資料，請求照樣即時返回。
      console.warn(`Scraper busy (${runningScrapes} running), skipping symbol: ${symbol}`);
      resolve('');
      return;
    }

    runningScrapes += 1;
    inFlightSymbols.add(symbol);
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      runningScrapes -= 1;
      inFlightSymbols.delete(symbol);
      resolve(value);
    };

    // 用 execFile ＋參數陣列，不經過 shell。symbol 永遠是一個獨立的 argv
    // 項目，就算含有 shell 特殊字元也只會被 Python 當成一個字串參數，
    // 不可能被解讀成另一條指令（原本用字串內插進 exec 會被 /bin/sh 拆開）。
    // In Docker context, the scraper is in /app/scrapers/stock_scraper.py
    execFile(
      'python3',
      ['/app/scrapers/stock_scraper.py', '--symbol', symbol],
      { timeout: SCRAPER_TIMEOUT_MS, maxBuffer: SCRAPER_MAX_BUFFER },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Scraper execution error: ${error.message}`);
        }
        done(stdout || stderr);
      }
    );
  });
};




app.get('/api/v1/stocks/trend', async (req, res) => {
  let { symbol, start_date, end_date } = req.query;
  if (!symbol) symbol = '2330.TW';
  if (!symbol.includes('.')) symbol += '.TW';

  try {
    // First, check if we have recent data
    let checkQuery = 'SELECT * FROM stocks_daily WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1';
    let checkRes = await pool.query(checkQuery, [symbol]);
    
    // If no data or data is old, trigger fetch
    if (checkRes.rows.length === 0) {
      await triggerScraper(symbol.split('.')[0]);
    }

    let query = 'SELECT * FROM stocks_daily WHERE symbol = $1';
    const params = [symbol];
    
    if (start_date) {
      params.push(start_date);
      query += ` AND trade_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND trade_date <= $${params.length}`;
    }
    
    query += ' ORDER BY trade_date ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});


app.get('/api/v1/housing/average-price', async (req, res) => {
  const { district } = req.query;
  try {
    let query = 'SELECT district, AVG(price_per_ping) as avg_price FROM housing_transactions WHERE 1=1';
    const params = [];
    
    if (district) {
      params.push(district);
      query += ` AND district = $${params.length}`;
    }
    
    query += ' GROUP BY district';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});


app.get('/api/v1/gold/trend', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gold_prices ORDER BY trade_date ASC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});


app.get('/api/v1/currencies/latest', async (req, res) => {
  try {
    // Get latest rate for each unique pair
    const result = await pool.query(`
      SELECT DISTINCT ON (pair) 
        pair, rate, trade_date 
      FROM currency_rates 
      ORDER BY pair, trade_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});


app.get('/api/v1/dashboard/overview', async (req, res) => {
  const { symbol = '2330.TW', district = '台北市' } = req.query;
  const targetSymbol = symbol.includes('.') ? symbol : (symbol.includes('^') ? symbol : `${symbol}.TW`);

  try {
    // Ensure we have some data for the requested stock
    const checkStock = await pool.query('SELECT 1 FROM stocks_daily WHERE symbol = $1 LIMIT 1', [targetSymbol]);
    if (checkStock.rows.length === 0) {
      await triggerScraper(symbol);
    }

    const latestStocks = await pool.query(
      'SELECT symbol, open_price, close_price, high_price, low_price, trade_date FROM stocks_daily WHERE symbol IN ($1, $2, $3) ORDER BY trade_date DESC LIMIT 120',
      [targetSymbol, '2330.TW', '^TWII']
    );
    const housingData = await pool.query('SELECT district, price_per_ping, transaction_date FROM housing_transactions ORDER BY transaction_date ASC');
    const goldTrend = await pool.query('SELECT * FROM gold_prices ORDER BY trade_date DESC LIMIT 40');
    const currencies = await pool.query('SELECT DISTINCT ON (pair) pair, rate FROM currency_rates ORDER BY pair, trade_date DESC');
    
    res.json({
      stocks: latestStocks.rows,
      housing: housingData.rows,
      gold: goldTrend.rows,
      currencies: currencies.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

app.listen(port, () => {
  console.log(`Backend API running on port ${port}`);
});

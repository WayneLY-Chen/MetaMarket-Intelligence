const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


const triggerScraper = (symbol) => {
  return new Promise((resolve) => {
    // In Docker context, the scraper is in /app/scrapers/stock_scraper.py
    // Use python3 to execute
    const cmd = `python3 /app/scrapers/stock_scraper.py --symbol ${symbol}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Scraper execution error: ${error.message}`);
      }
      resolve(stdout || stderr);
    });
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
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
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
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});


app.get('/api/v1/gold/trend', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gold_prices ORDER BY trade_date ASC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
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
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
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
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.listen(port, () => {
  console.log(`Backend API running on port ${port}`);
});

import yfinance as yf
import psycopg2
from psycopg2.extras import execute_values
import os
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def fetch_currency_data():
    pairs = {
        'USDTWD=X': 'USD/TWD',
        'EURTWD=X': 'EUR/TWD',
        'JPYTWD=X': 'JPY/TWD',
        'GBPTWD=X': 'GBP/TWD',
        'CNYTWD=X': 'CNY/TWD',
        'AUDTWD=X': 'AUD/TWD',
        'KRWTWD=X': 'KRW/TWD',
        'SGDTWD=X': 'SGD/TWD',
        'HKDTWD=X': 'HKD/TWD',
        'NZDTWD=X': 'NZD/TWD',
        'CADTWD=X': 'CAD/TWD',
        'CHFTWD=X': 'CHF/TWD',
        'MYRTWD=X': 'MYR/TWD',
        'THBTWD=X': 'THB/TWD',
        'VNDTWD=X': 'VND/TWD',
        'PHPTWD=X': 'PHP/TWD',
        'SEKTWD=X': 'SEK/TWD',
        'DKKTWD=X': 'DKK/TWD',
        'NOKTWD=X': 'NOK/TWD',
        'MXNTWD=X': 'MXN/TWD',
        'ZARTWD=X': 'ZAR/TWD',
        'BRLTWD=X': 'BRL/TWD',
        'INRTWD=X': 'INR/TWD',
        'IDRTWD=X': 'IDR/TWD',
        'EURUSD=X': 'EUR/USD'
    }
    symbols = list(pairs.keys())
    try:
        data = yf.download(symbols, period="5d", interval="1d")
        records = []
        for symbol in symbols:
            # Handle multiple tickers
            if len(symbols) > 1:
                ticker_data = data.xs(symbol, level=1, axis=1)
            else:
                ticker_data = data
            
            for date, row in ticker_data.iterrows():
                if not row.isnull().any():
                    records.append((
                        pairs[symbol],
                        float(row['Close']),
                        date.strftime('%Y-%m-%d')
                    ))
        return records
    except Exception as e:
        print(f"Error fetching currency data: {e}")
        return []

def save_to_db(records):
    if not records:
        return
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
    INSERT INTO currency_rates (pair, rate, trade_date)
    VALUES %s
    ON CONFLICT (pair, trade_date) DO UPDATE SET
        rate = EXCLUDED.rate;
    """
    try:
        execute_values(cur, query, records)
        conn.commit()
        print(f"Inserted/Updated {len(records)} currency records.")
    except Exception as e:
        print(f"Error saving currency data to DB: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    while True:
        print(f"[{datetime.now()}] Starting currency scraping...")
        data = fetch_currency_data()
        save_to_db(data)
        interval = int(os.getenv("FETCH_INTERVAL", 86400))
        print(f"Sleeping for {interval} seconds...")
        time.sleep(interval)

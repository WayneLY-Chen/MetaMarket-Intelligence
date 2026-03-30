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

def fetch_gold_data():
    gold_symbol = 'GC=F'
    fx_symbol = 'USDTWD=X'
    try:
        gold_data = yf.download(gold_symbol, period="30d", interval="1d")
        fx_data = yf.download(fx_symbol, period="30d", interval="1d")
        
        records = []
        for date, row in gold_data.iterrows():
            if not row.isnull().any():
                # Get closest FX rate for the date
                try:
                    rate = fx_data.loc[date.strftime('%Y-%m-%d')]['Close']
                except:
                    rate = fx_data['Close'].iloc[-1] # Fallback to latest
                
                usd_price = float(row['Close'])
                # 1 oz = 31.1035g, 1 liang = 37.5g
                twd_gram = (usd_price / 31.1035) * float(rate)
                twd_liang = twd_gram * 37.5
                
                records.append((
                    date.strftime('%Y-%m-%d'),
                    float(row['Open']),
                    usd_price,
                    float(row['High']),
                    float(row['Low']),
                    int(row['Volume']),
                    float(twd_gram),
                    float(twd_liang)
                ))
        return records
    except Exception as e:
        print(f"Error fetching gold data: {e}")
        return []

def save_to_db(records):
    if not records:
        return
    conn = get_db_connection()
    cur = conn.cursor()
    query = """
    INSERT INTO gold_prices (trade_date, open_price, close_price, high_price, low_price, volume, price_twd_gram, price_twd_liang)
    VALUES %s
    ON CONFLICT (trade_date) DO UPDATE SET
        open_price = EXCLUDED.open_price,
        close_price = EXCLUDED.close_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        volume = EXCLUDED.volume,
        price_twd_gram = EXCLUDED.price_twd_gram,
        price_twd_liang = EXCLUDED.price_twd_liang;
    """
    try:
        execute_values(cur, query, records)
        conn.commit()
        print(f"Inserted/Updated {len(records)} gold records.")
    except Exception as e:
        print(f"Error saving gold data to DB: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    while True:
        print(f"[{datetime.now()}] Starting gold scraping...")
        data = fetch_gold_data()
        save_to_db(data)
        interval = int(os.getenv("FETCH_INTERVAL", 86400))
        print(f"Sleeping for {interval} seconds...")
        time.sleep(interval)

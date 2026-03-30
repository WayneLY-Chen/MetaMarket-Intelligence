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

def fetch_stock_data():
    symbols = ['2330.TW', '^TWII']
    try:
        data = yf.download(symbols, period="5d", interval="1d")
        records = []
        
        for symbol in symbols:
            # Handle multiple tickers in a single download
            if len(symbols) > 1:
                ticker_data = data.xs(symbol, level=1, axis=1)
            else:
                ticker_data = data
            
            for date, row in ticker_data.iterrows():
                if not row.isnull().any():
                     records.append((
                        symbol,
                        date.strftime('%Y-%m-%d'),
                        float(row['Open']),
                        float(row['Close']),
                        float(row['High']),
                        float(row['Low']),
                        int(row['Volume'])
                    ))
        
        return records
    except Exception as e:
        print(f"Error fetching stock data: {e}")
        return []

def save_to_db(records):
    if not records:
        return
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    INSERT INTO stocks_daily (symbol, trade_date, open_price, close_price, high_price, low_price, volume)
    VALUES %s
    ON CONFLICT (symbol, trade_date) DO UPDATE SET
        open_price = EXCLUDED.open_price,
        close_price = EXCLUDED.close_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        volume = EXCLUDED.volume;
    """
    
    try:
        execute_values(cur, query, records)
        conn.commit()
        print(f"Inserted/Updated {len(records)} stock records.")
    except Exception as e:
        print(f"Error saving to DB: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", help="Specific symbol to fetch")
    args = parser.parse_args()
    
    if args.symbol:
        print(f"[{datetime.now()}] On-demand fetch for {args.symbol}")
        # Fetch just this symbol
        symbols = [args.symbol if '.TW' in args.symbol else f"{args.symbol}.TW"]
        try:
            data = yf.download(symbols, period="5d", interval="1d")
            if not data.empty:
                records = []
                for symbol in symbols:
                     # Handle single vs multiple tickers
                    ticker_data = data.xs(symbol, level=1, axis=1) if len(symbols) > 1 else data
                    for date, row in ticker_data.iterrows():
                        if not row.isnull().any():
                             records.append((
                                symbol,
                                date.strftime('%Y-%m-%d'),
                                float(row['Open']),
                                float(row['Close']),
                                float(row['High']),
                                float(row['Low']),
                                int(row['Volume'])
                            ))
                save_to_db(records)
        except Exception as e:
            print(f"Error in on-demand fetch: {e}")
    else:
        while True:
            print(f"[{datetime.now()}] Starting stock scraping...")
            data = fetch_stock_data()
            save_to_db(data)
            
            interval = int(os.getenv("FETCH_INTERVAL", 86400))
            print(f"Sleeping for {interval} seconds...")
            time.sleep(interval)

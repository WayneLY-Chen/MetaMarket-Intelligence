import psycopg2
from psycopg2.extras import execute_values
import os
import time
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

CATEGORIES = ['Stock', 'Housing']
SOURCES = ['PTT', 'Dcard']

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def simulate_sentiment_data():
    records = []
    today = datetime.now()
    
    for category in CATEGORIES:
        for source in SOURCES:
            # Generate hourly sentiment for last 24 hours
            for h in range(24):
                post_time = today - timedelta(hours=h)
                sentiment = random.uniform(-0.5, 0.8) # generally slightly positive for simulation
                records.append((
                    source,
                    category,
                    sentiment,
                    post_time.strftime('%Y-%m-%d %H:%00:00')
                ))
    return records

def save_to_db(records):
    if not records:
        return
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    INSERT INTO social_sentiment (source, topic_category, sentiment_score, post_time)
    VALUES %s
    ON CONFLICT (source, post_time) DO UPDATE SET
        sentiment_score = EXCLUDED.sentiment_score;
    """
    
    try:
        execute_values(cur, query, records)
        conn.commit()
        print(f"Updated {len(records)} sentiment records.")
    except Exception as e:
        print(f"Error saving sentiment to DB: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    while True:
        print(f"[{datetime.now()}] Refreshing sentiment metrics...")
        data = simulate_sentiment_data()
        save_to_db(data)
        
        interval = int(os.getenv("FETCH_INTERVAL", 3600))
        print(f"Sleeping for {interval} seconds...")
        time.sleep(interval)

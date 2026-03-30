import psycopg2
from psycopg2.extras import execute_values
import os
import time
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DISTRICTS = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市']
TARGET_DISTRICTS = ['台北市', '桃園市', '台中市', '基隆市']

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def generate_mock_housing_data():
    records = []
    today = datetime.now()
    
    for district in TARGET_DISTRICTS:
        # Generate last 3 months of data
        base_price = {
            '台北市': 1000000,
            '桃園市': 350000,
            '台中市': 450000,
            '基隆市': 250000
        }.get(district, 300000)
        
        for i in range(12):
            transaction_date = (today - timedelta(weeks=i)).strftime('%Y-%m-%d')
            # Add some random fluctuation
            price = base_price * (1 + random.uniform(-0.05, 0.05))
            records.append((
                district,
                random.choice(['大樓', '公寓', '華廈']),
                price * 30, # total price
                price, # price per ping
                30.0, # building area
                transaction_date
            ))
    return records

def save_to_db(records):
    if not records:
        return
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    INSERT INTO housing_transactions (district, property_type, total_price, price_per_ping, building_area, transaction_date)
    VALUES %s
    ON CONFLICT (district, transaction_date) DO UPDATE SET
        total_price = EXCLUDED.total_price,
        price_per_ping = EXCLUDED.price_per_ping,
        building_area = EXCLUDED.building_area;
    """
    
    try:
        execute_values(cur, query, records)
        conn.commit()
        print(f"Inserted {len(records)} housing records.")
    except Exception as e:
        print(f"Error saving housing to DB: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    while True:
        print(f"[{datetime.now()}] Starting housing data population...")
        data = generate_mock_housing_data()
        save_to_db(data)
        
        interval = int(os.getenv("FETCH_INTERVAL", 604800))
        print(f"Sleeping for {interval} seconds...")
        time.sleep(interval)

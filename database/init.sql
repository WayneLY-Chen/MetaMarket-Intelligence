-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: stocks_daily
CREATE TABLE IF NOT EXISTS stocks_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(15) NOT NULL,
    trade_date DATE NOT NULL,
    open_price DECIMAL(15, 2),
    close_price DECIMAL(15, 2),
    high_price DECIMAL(15, 2),
    low_price DECIMAL(15, 2),
    volume BIGINT,
    UNIQUE(symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks_daily(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_date ON stocks_daily(trade_date);

-- Table: gold_prices
CREATE TABLE IF NOT EXISTS gold_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_date DATE NOT NULL UNIQUE,
    open_price DECIMAL(15, 2),
    close_price DECIMAL(15, 2),
    high_price DECIMAL(15, 2),
    low_price DECIMAL(15, 2),
    volume BIGINT
);

-- Table: currency_rates
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(15) NOT NULL,
    rate DECIMAL(15, 6) NOT NULL,
    trade_date DATE NOT NULL,
    UNIQUE(pair, trade_date)
);

-- Table: housing_transactions
CREATE TABLE IF NOT EXISTS housing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district VARCHAR(20) NOT NULL,
    property_type VARCHAR(20),
    total_price DECIMAL(20, 2),
    price_per_ping DECIMAL(15, 2),
    building_area DECIMAL(10, 2),
    transaction_date DATE NOT NULL,
    UNIQUE(district, transaction_date)
);
CREATE INDEX IF NOT EXISTS idx_housing_district ON housing_transactions(district);
CREATE INDEX IF NOT EXISTS idx_housing_date ON housing_transactions(transaction_date);

-- Table: social_sentiment
CREATE TABLE IF NOT EXISTS social_sentiment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(20) NOT NULL,
    topic_category VARCHAR(20) NOT NULL,
    sentiment_score DECIMAL(5, 2),
    post_time TIMESTAMP NOT NULL,
    UNIQUE(source, post_time)
);

-- Table: scraper_logs
CREATE TABLE IF NOT EXISTS scraper_logs (
    id SERIAL PRIMARY KEY,
    scraper_name VARCHAR(50),
    status VARCHAR(20),
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Stocks)
INSERT INTO stocks_daily (symbol, trade_date, open_price, close_price, high_price, low_price, volume) VALUES
('2330.TW', '2026-03-27', 790, 800.00, 805, 788, 1000000),
('2330.TW', '2026-03-30', 802, 810.00, 815, 800, 1100000),
('^TWII', '2026-03-27', 19800, 20000.00, 20100, 19750, 5000000),
('^TWII', '2026-03-30', 20050, 20200.00, 20250, 20000, 5200000)
ON CONFLICT DO NOTHING;

-- Seed Data (Gold)
INSERT INTO gold_prices (trade_date, open_price, close_price, high_price, low_price) VALUES
('2026-03-27', 2150.00, 2165.50, 2175.00, 2145.00),
('2026-03-30', 2168.00, 2182.20, 2190.00, 2160.00)
ON CONFLICT DO NOTHING;

-- Seed Data (Currency)
INSERT INTO currency_rates (pair, rate, trade_date) VALUES
('USD/TWD', 31.85, '2026-03-30'),
('EUR/TWD', 34.45, '2026-03-30'),
('JPY/TWD', 0.2105, '2026-03-30'),
('GBP/TWD', 40.25, '2026-03-30'),
('CNY/TWD', 4.41, '2026-03-30'),
('EUR/USD', 1.082, '2026-03-30')
ON CONFLICT DO NOTHING;

-- Seed Data (Housing - All 22 Regions)
INSERT INTO housing_transactions (district, price_per_ping, transaction_date) VALUES
('台北市', 105.5, '2026-03-01'),
('新北市', 62.2, '2026-03-01'),
('桃園市', 38.5, '2026-03-01'),
('台中市', 48.2, '2026-03-01'),
('台南市', 32.5, '2026-03-01'),
('高雄市', 35.8, '2026-03-01'),
('基隆市', 28.5, '2026-03-01'),
('新竹市', 55.4, '2026-03-01'),
('新竹縣', 45.2, '2026-03-01'),
('苗栗縣', 22.5, '2026-03-01'),
('彰化縣', 21.8, '2026-03-01'),
('南投縣', 18.5, '2026-03-01'),
('雲林縣', 16.2, '2026-03-01'),
('嘉義市', 20.5, '2026-03-01'),
('嘉義縣', 15.8, '2026-03-01'),
('屏東縣', 19.2, '2026-03-01'),
('宜蘭縣', 24.5, '2026-03-01'),
('花蓮縣', 21.2, '2026-03-01'),
('台東縣', 18.2, '2026-03-01'),
('澎湖縣', 22.1, '2026-03-01'),
('金門縣', 25.4, '2026-03-01'),
('連江縣', 18.8, '2026-03-01')
ON CONFLICT DO NOTHING;

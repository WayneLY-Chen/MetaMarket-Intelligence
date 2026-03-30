# 軟體需求規格書 (SRS)：市場情報自動化數據管線與儀表板

## 1. 專案概述 (Project Overview)
本專案旨在建立一個自動化的「市場情報監控系統」，整合**房價趨勢、股市表現、以及社群情緒**三大資料源。系統將透過定時排程的網路爬蟲獲取原始資料，經過清洗與轉換 (ETL) 後存入關聯式資料庫，並提供一個視覺化的前端 Dashboard 供使用者進行交叉比對與趨勢分析。全系統將完全 Docker 化，確保開發、測試與生產環境的一致性，並支援一鍵部署。

## 2. 系統架構 (System Architecture)
系統採用微服務 (Microservices) 概念設計，區分四大核心模組：
1. **Scraper Workers (資料抓取服務)：** 包含三個獨立的 Python 爬蟲進程，分別負責股票、房價與社群庫的資料抓取。
2. **Backend API (後端服務)：** 採用 Node.js / Express，負責處理前端請求、執行商業邏輯、聚合跨領域資料，並與資料庫互動。
3. **Database (資料庫)：** 採用 PostgreSQL，儲存結構化與時間序列資料。
4. **Frontend Dashboard (前端展示)：** 採用 React.js，提供互動式圖表與即時篩選介面。

## 3. 資料管道與爬蟲規格 (Data Pipeline Specifications)

### 3.1 股市資料模組 (Stock Market Module)
* **資料來源：** 台灣證券交易所 (TWSE) 開放 API 或 Yahoo Finance API。
* **抓取頻率：** 每個交易日 14:30 執行一次。
* **清洗邏輯：** 移除空值，轉換資料型態（字串轉浮點數），計算每日漲跌幅。
* **目標欄位：** 股票代號、日期、開盤價、收盤價、最高價、最低價、交易量。

### 3.2 房價資料模組 (Housing Market Module)
* **資料來源：** 內政部實價登錄開放資料庫 / 知名房仲網 (如 591) 租售屋公開資訊。
* **抓取頻率：** 每週日凌晨 02:00 執行一次。
* **清洗邏輯：** 統一地址格式提取「行政區」，濾除極端異常值 (防呆機制)，坪數與總價換算為「單坪價格」。
* **目標欄位：** 交易日期、行政區、物件類型 (大樓/公寓)、總價、單坪價格、建坪。

### 3.3 社群情緒模組 (Social Sentiment Module)
* **資料來源：** PTT (Stock/home-sale 版) / Dcard 相關看板。
* **抓取頻率：** 每小時執行一次。
* **清洗邏輯：** 擷取文章標題與內文，進行基本斷詞 (Jieba)，並比對正負面情緒字典，計算「情緒分數 (Sentiment Score)」。
* **目標欄位：** 文章 ID、來源 (PTT/Dcard)、看板、發文時間、關鍵字標籤、情緒分數 (-1.0 到 1.0)。

## 4. 資料庫綱要 (Database Schema)

### Table: `stocks_daily`
| 欄位名稱 | 資料型態 | 屬性 / 說明 |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `symbol` | VARCHAR(10) | 股票代號 (Index) |
| `trade_date` | DATE | 交易日期 (Index) |
| `close_price` | DECIMAL | 收盤價 |
| `volume` | BIGINT | 成交量 |

### Table: `housing_transactions`
| 欄位名稱 | 資料型態 | 屬性 / 說明 |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `district` | VARCHAR(20) | 行政區 (Index) |
| `property_type`| VARCHAR(20) | 物件類型 |
| `price_per_ping`| DECIMAL | 單坪價格 |
| `transaction_date`| DATE | 交易日期 (Index) |

### Table: `social_sentiment`
| 欄位名稱 | 資料型態 | 屬性 / 說明 |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `source` | VARCHAR(20) | 來源 (PTT/Dcard) |
| `topic_category`| VARCHAR(20) | 關聯分類 (Stock/Housing) |
| `sentiment_score`| DECIMAL | 情緒分數 |
| `post_time` | TIMESTAMP | 發文時間 (Index) |

## 5. API 規格 (API Design)
後端提供 RESTful API 供前端呼叫，皆採用 JSON 格式回傳。

* **GET `/api/v1/stocks/trend`**
  * 說明：取得特定股票區間價格趨勢。
  * 參數：`symbol`, `start_date`, `end_date`
* **GET `/api/v1/housing/average-price`**
  * 說明：取得各行政區特定時間內的平均單坪價格。
  * 參數：`district` (optional), `year`, `month`
* **GET `/api/v1/sentiment/daily-summary`**
  * 說明：取得特定分類 (如股市) 每日的情緒分數總和與討論熱度。
  * 參數：`topic_category`, `date`
* **GET `/api/v1/dashboard/overview`**
  * 說明：(聚合 API) 一次取得當日大盤表現、房市均價異動與市場情緒指標，供儀表板首頁快速渲染。

## 6. 容器化與部署設計 (Docker & Deployment)
專案使用 Docker Compose 進行多容器編排，包含以下服務 (Services)：

1. **`db`:** 基於 `postgres:15-alpine` 映像檔，並掛載 volume 確保資料持久化。
2. **`scraper_stock` / `scraper_housing` / `scraper_sentiment`:** 基於 `python:3.10-slim`，透過 Cron 執行對應的爬蟲腳本。
3. **`backend`:** 基於 `node:18-alpine`，暴露 3000 port 提供 API 服務。
4. **`frontend`:** 將 React 應用打包為靜態檔後，使用 `nginx:alpine` 伺服器代理，暴露 80 port。

**環境變數與安全：**
所有機密資訊 (如 DB_USER, DB_PASSWORD, API_KEYS) 皆必須存放於 `.env` 檔案中，並在 `docker-compose.yml` 中傳遞，嚴禁將憑證硬編碼於程式碼或 Dockerfile 中。

## 7. 異常處理與重試機制 (Error Handling & Retry)
* **爬蟲層：** 實作 Exponential Backoff 重試機制。若連續失敗 3 次，將該次任務標記為 Failed，並記錄至 `scraper_logs` 表。
* **資料層：** 使用 Upsert (ON CONFLICT DO UPDATE) 邏輯，避免重複排程導致資料庫寫入重複資料 (Duplicate Keys)。
* **API 層：** 統一回傳標準 HTTP 狀態碼 (200, 400, 404, 500) 與錯誤訊息格式 `{"error": {"code": "...", "message": "..."}}`。
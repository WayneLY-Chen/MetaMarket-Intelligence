# MetaMarket-Intelligence

MetaMarket-Intelligence is a sophisticated financial data terminal built with React and Node.js. It integrates real-time stock market dynamics, comprehensive regional housing price data, physical gold price monitoring, and an advanced universal currency conversion engine. The platform leverages high-performance data processing pipelines to synchronize and visualize multi-dimensional market metrics, providing an institutional-grade monitoring experience for modern financial research and analysis.

---

## 💎 核心特色 | Key Features

### 📈 專業級股市即時監控
- 📊 **動態 K 線技術分析**: 整合個股與加權指數即時行情，支援高精度數據渲染。
- 🧠 **市場情緒分析**: 透過智能指標追蹤大盤情緒，輔助專業投資決策。

### 🏠 全台房價精確看板
- 📍 **行政區即時監測**: 提供台北、新北等全台 22 行政區之最新均價 (萬/坪) 排名。
- 📉 **歷史趨勢追蹤**: 深入分析各縣市房價走勢，鎖定投資熱區。

### 💰 實體金價自動回報
- 🪙 **720 家金店行情整合**: 自動鎖定全台實體金價，支援「錢」與「兩」之單位互換分析。
- 📅 **歷史價格圖表**: 提供 40 日最高精度金價波動曲線。

### 🌍 全球幣值智能終端
- 🏹 **25+ 國即時匯率**: 擴展至澳幣、韓元、泰銖等全球主流與新興市場貨幣。
- ⛓️ **四路徑跳轉引擎**: 獨家 Multi-Hop 技術，自動透過 USD/TWD 中轉解決資料空白問題，確保換算絕不失誤。
- 🌐 **在地化介面**: 根據系統語言自動顯示幣別全稱 (例如：USD 美元)。

---

## 🛠 核心技術 | Technology Stack

- **Frontend**: React 18, Recharts, Lucide Icons
- **Backend**: Node.js Express, PostgreSQL (Data Persistence)
- **Data Pipeline**: Python Scrapers (YFinance, Real Estate Crawlers)
- **DevOps**: Docker, Docker Compose

---

## 📄 授權協議 | License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🚀 快速啟動 | Getting Started

```bash
# 克隆專案
git clone https://github.com/WayneLY-Chen/MetaMarket-Intelligence.git

# 啟動全系統容器
docker-compose up -d --build
```

---

## 🛡️ 實用的 Docker 管理小提示 | Docker Management Tips

### 🔍 看它現在有沒有乖乖跑？
```powershell
docker-compose ps
```

### 🛑 如果要關掉它？
```powershell
docker-compose down
```

### 📊 如果想看數據同步跑得怎樣（例如匯率抓了沒）？
```powershell
docker-compose logs -f currency_worker
```

Explore the pinnacle of financial data intelligence. 🚀

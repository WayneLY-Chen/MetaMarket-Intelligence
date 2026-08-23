# Node 18 在 2025-04 就結束維護了，不再收到任何安全修補。24 是現行的 LTS
# （維護到 2028-04），而且 express 4 / pg 8 這幾個相依在上面沒有已知問題。
FROM node:24-alpine

# Install Python and dependencies for stock scraper
#
# tzdata 是必要的，不是可有可無：Alpine 的映像檔（不論 node:18 還是 node:24）
# 都不含 /usr/share/zoneinfo，而 yfinance 抓台股時要查 Asia/Taipei，查不到就
# 丟 ZoneInfoNotFoundError 而整筆下載失敗。
# 這個問題在換 Node 版本之前就存在，只是那時候爬蟲更早就死在 import dotenv，
# 所以從來沒有人走到這一步。
RUN apk add --no-cache python3 py3-pip build-base python3-dev postgresql-dev tzdata

# 這裡原本是手寫的三個套件（yfinance pandas psycopg2-binary），跟
# scrapers/requirements.txt 各自維護，結果就漏了 python-dotenv。
# server.js 的 triggerScraper 跑的是 /app/scrapers/stock_scraper.py，而那支的
# 第 7 行是 `from dotenv import load_dotenv` —— 也就是說這條隨選補資料的路
# 從來沒有成功執行過，每次都是 ModuleNotFoundError 收場。
# 改成直接讀 scrapers/requirements.txt，讓它成為唯一的來源。
COPY scrapers/requirements.txt /tmp/scraper-requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/scraper-requirements.txt --break-system-packages

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./
RUN npm install

# Copy all files from backend directory
COPY backend/ .

EXPOSE 3000
CMD ["npm", "start"]

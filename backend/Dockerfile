# Node 18 在 2025-04 就結束維護了，不再收到任何安全修補。24 是現行的 LTS
# （維護到 2028-04），而且 express 4 / pg 8 這幾個相依在上面沒有已知問題。
FROM node:24-alpine

# Install Python and dependencies for stock scraper
RUN apk add --no-cache python3 py3-pip build-base python3-dev postgresql-dev
RUN pip3 install --no-cache-dir yfinance pandas psycopg2-binary --break-system-packages

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./
RUN npm install

# Copy all files from backend directory
COPY backend/ .

EXPOSE 3000
CMD ["npm", "start"]

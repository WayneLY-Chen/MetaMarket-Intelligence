FROM node:18-alpine

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

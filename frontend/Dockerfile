# Build stage
# 同 backend/Dockerfile：Node 18 已結束維護。這裡只是建置階段，產物會被複製到
# nginx 映像檔裡，所以換版本不影響最後跑起來的東西。
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

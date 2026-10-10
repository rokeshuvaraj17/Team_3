FROM node:20-slim
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix frontend && npm ci --prefix backend

COPY frontend ./frontend
COPY backend ./backend
RUN npx --prefix frontend vite build

WORKDIR /app/backend
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]

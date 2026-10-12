FROM node:20-slim
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY backend/package.json backend/package-lock.json ./backend/
# Coolify injects NODE_ENV=production at build time, which makes npm skip Vite.
RUN npm ci --include=dev --prefix frontend && npm ci --include=dev --prefix backend

COPY frontend ./frontend
COPY backend ./backend
# Vite's entry is frontend/index.html. Running from /app makes that file unresolvable.
WORKDIR /app/frontend
RUN npx vite build

WORKDIR /app/backend
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]

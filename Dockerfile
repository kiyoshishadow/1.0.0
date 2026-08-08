FROM node:24-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

FROM node:24-bookworm-slim

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY backend ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "node -e \"import('./db-init.js').then(m => m.initializeDatabase())\" && node migrate.js && node index.js"]

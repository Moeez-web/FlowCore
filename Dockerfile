# ── Stage 1: Build ──
FROM node:22-bookworm-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY src ./src
COPY public ./public

RUN npm run build:css

# ── Stage 2: Runtime ──
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ sqlite3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY --from=builder /app/public ./public
COPY tsconfig.json ./
COPY src ./src
COPY entrypoint.sh ./

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start"]

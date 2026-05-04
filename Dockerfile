FROM node:22-bookworm-slim

# Native deps for better-sqlite3 compile + sqlite cli for ad-hoc DB inspection
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates sqlite3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# App source
COPY tsconfig.json ./
COPY src ./src

# Data directory — Railway volume mounts on top of this at runtime
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start"]

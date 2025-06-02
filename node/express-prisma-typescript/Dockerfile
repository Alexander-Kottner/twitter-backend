FROM node:lts-slim AS deps

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

FROM node:lts-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY jest.setup.ts ./
COPY nodemon.json ./
COPY src ./src
COPY prisma ./prisma

RUN yarn db:generate

RUN yarn build

RUN echo "=== Build verification ===" && \
    ls -la . && \
    echo "=== Checking dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking server.js ===" && \
    ls -la dist/server.js && \
    echo "=== Build complete ==="

FROM node:lts-slim AS runner

WORKDIR /app
ENV NODE_ENV production

RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN echo "=== Production verification ===" && \
    ls -la . && \
    echo "=== Checking dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking server.js ===" && \
    ls -la dist/server.js && \
    echo "=== Production setup complete ==="

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app
USER nodeuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

EXPOSE ${PORT:-3000}

CMD ["yarn", "prod"]

FROM node:lts-slim AS dev

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY nodemon.json ./nodemon.json
COPY tsconfig.json ./tsconfig.json
COPY . .

CMD yarn dev

# 1. Base layer for installing deps
FROM node:18-slim AS deps

WORKDIR /app

RUN apt-get update -y && apt-get install -y \
  openssl \
  libssl3 \
  ca-certificates \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./

# Install all deps (not just prod) here so dev/build works
RUN yarn install --frozen-lockfile


# 2. Builder layer
FROM node:18-slim AS builder

WORKDIR /app

# Same build tools here
RUN apt-get update -y && apt-get install -y \
  openssl \
  libssl3 \
  ca-certificates \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock tsconfig.json jest.setup.ts nodemon.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client & build project
RUN yarn db:generate
RUN yarn build


# 3. Runtime layer
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y \
  openssl \
  libssl3 \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy only what’s needed
COPY package.json yarn.lock ./

# Create yarn cache directory and install prod dependencies
RUN mkdir -p /tmp/.yarn-cache && \
    yarn config set cache-folder /tmp/.yarn-cache && \
    yarn install --production --frozen-lockfile

# Copy dist files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Add unprivileged user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE ${PORT:-3000}

CMD ["node", "dist/server.js"]

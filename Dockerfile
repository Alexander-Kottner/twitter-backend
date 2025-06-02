# Install dependencies
FROM node:18-slim AS deps

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build source code
FROM node:18-slim AS builder

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy dependencies and files needed for build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock tsconfig.json jest.setup.ts nodemon.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client and build
RUN yarn db:generate
RUN yarn build

# Ensure dist directory and server.js exist
RUN test -f dist/server.js || (echo "Build failed: dist/server.js not found" && exit 1)

# Production runtime
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL, curl for healthcheck, and build dependencies for native modules
RUN apt-get update -y && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Rebuild native modules for the current architecture
RUN yarn install --production --force

# Copy built files and Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Final verification
RUN test -f dist/server.js || (echo "server.js missing in production stage" && exit 1)

# Add security user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE ${PORT:-3000}

CMD ["yarn", "prod"]

# Development runtime
FROM node:18-slim AS dev

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY nodemon.json ./nodemon.json
COPY tsconfig.json ./tsconfig.json
COPY . .

CMD yarn dev
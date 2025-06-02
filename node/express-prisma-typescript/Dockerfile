# Install dependencies
FROM node:lts-slim AS deps

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

# Build source code
FROM node:lts-slim AS builder

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy all necessary files for the build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY jest.setup.ts ./
COPY nodemon.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client first
RUN yarn db:generate

# Build TypeScript - with verbose output to debug
RUN yarn build

# Verify the build output exists and show contents
RUN echo "=== Build verification ===" && \
    ls -la . && \
    echo "=== Checking dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking server.js ===" && \
    ls -la dist/server.js && \
    echo "=== Build complete ==="

# Production runtime
FROM node:lts-slim AS runner

WORKDIR /app

ENV NODE_ENV production

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy built application and Prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify the files are copied correctly to production stage
RUN echo "=== Production verification ===" && \
    ls -la . && \
    echo "=== Checking dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking server.js ===" && \
    ls -la dist/server.js && \
    echo "=== Production setup complete ==="

# Add non-root user for better security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app
USER nodeuser

# Healthcheck to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

# Expose the port
EXPOSE ${PORT:-3000}

# Run the application
CMD ["yarn", "prod"]

# Development runtime
FROM node:lts-slim AS dev

WORKDIR /app

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY nodemon.json ./nodemon.json
COPY tsconfig.json ./tsconfig.json
COPY . .

CMD yarn dev

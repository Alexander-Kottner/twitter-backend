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

COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client and build TypeScript
RUN yarn db:generate
RUN yarn build

# Verify the build output exists
RUN ls -la dist/ && ls -la dist/server.js

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

# Verify the files are copied correctly
RUN ls -la dist/ && ls -la dist/server.js

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

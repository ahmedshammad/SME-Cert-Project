# Multi-stage Dockerfile for NestJS API
# Production-optimized build

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package file
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma/

# Install dependencies
RUN npm install

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/api/ ./

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# ============================================================================
# Stage 3: Production Runtime
# ============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for signal handling and openssl for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create directories for logs and uploads
RUN mkdir -p logs uploads && \
    chown -R nestjs:nodejs logs uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]

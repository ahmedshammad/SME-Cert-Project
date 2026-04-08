# Multi-stage Dockerfile for React Frontend
# Production-optimized build with Nginx

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package file
COPY apps/web/package.json ./

# Install dependencies
RUN npm install

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/web/ ./

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_PLATFORM_NAME="SME Certificate Trust Platform"

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_PLATFORM_NAME=${VITE_PLATFORM_NAME}

# Build application
RUN npm run build

# Security: remove any source maps that may have been generated
RUN find /app/dist -name '*.map' -type f -delete 2>/dev/null || true

# ============================================================================
# Stage 3: Production with Nginx
# ============================================================================
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application (source maps already stripped)
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove any leftover dev artifacts
RUN rm -rf /usr/share/nginx/html/src \
           /usr/share/nginx/html/*.map \
           /usr/share/nginx/html/**/*.map 2>/dev/null || true

# Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Add labels
LABEL maintainer="SME Cert Platform Team"
LABEL description="SME Certificate Trust Platform - Frontend"

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

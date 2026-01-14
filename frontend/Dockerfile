# Dockerfile for Frontend Nuxt.js
# Multi-stage build for production

# Stage 1: Build (Nuxt 4 requires Node 20+)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application from builder (no need to reinstall deps)
COPY --from=builder /app/.output ./.output

# Copy built application from builder
COPY --from=builder /app/.output ./.output

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start application
CMD ["node", ".output/server/index.mjs"]

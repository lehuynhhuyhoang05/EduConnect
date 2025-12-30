# Dockerfile for Backend (Optional - chỉ dùng khi deploy)
# Development: Chạy npm run start:dev trên local, KHÔNG cần Docker!
# Production: Build image này

FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "start:prod"]

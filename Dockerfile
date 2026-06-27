# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Stage 2: Production
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Copy package files and install production only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Install wget for health check
RUN apk add --no-cache wget

# Copy source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/seeders ./seeders

# Change ownership
RUN chown -R appuser:nodejs /app

USER appuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]

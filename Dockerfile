# Multi-stage Dockerfile for Next.js 13 (App Router) SSR with standalone output
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (clean, reproducible)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build (uses next.config.js with output=standalone)
ENV NODE_ENV=production
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Add dumb-init for proper signal handling (optional)
RUN apk add --no-cache dumb-init

# Copy only necessary build artifacts from builder
# .next/standalone contains server.js and minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# If you serve favicon or other root files outside /public, copy them:
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Non-root user for security
USER node

# Required env vars at runtime:
# - POSTGRES_URL (connection string)
# Optional:
# - PORT (defaults to 3000)
ENV PORT=3000
EXPOSE 3000

# Healthcheck (adjust path if needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/v1 > /dev/null || exit 1

# Start with dumb-init to handle PID1 signals gracefully
CMD ["dumb-init","node","server.js"]


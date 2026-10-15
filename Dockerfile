# syntax=docker/dockerfile:1.4
# ==============================================================================
# irid.ai Timetable — Production Hardened Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Bundle
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache libc6-compat

# Activate pnpm via corepack with explicit checksum pinning
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

# Cache dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Build production web bundle (SPA export)
ENV NODE_ENV=production
RUN pnpm run build:web

# ------------------------------------------------------------------------------
# Stage 2: Minimal Hardened Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Security updates and wget for healthchecks
RUN apk update && apk upgrade && apk add --no-cache wget

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy only build artifacts and server script
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.js ./server.js

# Healthcheck to monitor container availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Run as non-privileged unmapped user
USER node

EXPOSE 3000

# Start hardened HTTP server
CMD ["node", "server.js"]

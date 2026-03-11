# =============================================================================
# SEOPen API — Multi-stage Dockerfile
# Build context: monorepo root (web-seo/)
# =============================================================================

# ── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat bash openssl
WORKDIR /repo

# ── Stage 2: install all deps (cached unless manifests change) ───────────────
FROM base AS deps
# Copy workspace manifests only for cache efficiency
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
# Full install including devDeps (TypeScript + prisma CLI needed for build)
RUN npm ci

# ── Stage 3: build ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY turbo.json ./

# Build @seopen/shared first (API depends on it)
RUN npm run build --workspace=packages/shared
# Generate Prisma client
RUN cd apps/api && npx prisma generate
# Build NestJS API
RUN npm run build --workspace=apps/api

# ── Stage 4: production runtime ──────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Root node_modules: hoisted workspace deps + .prisma generated client
COPY --from=builder /repo/node_modules ./node_modules

# @seopen/shared runtime files
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder /repo/packages/shared/package.json ./packages/shared/package.json

# API compiled output + scoped node_modules
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json

# Prisma schema + migrations (needed by migrate deploy at startup)
COPY --from=builder /repo/apps/api/prisma ./apps/api/prisma

# Entrypoint
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

WORKDIR /repo/apps/api
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "dist/main"]

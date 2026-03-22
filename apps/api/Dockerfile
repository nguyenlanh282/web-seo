# =============================================================================
# SEOPen API — Multi-stage Dockerfile
# Build context: monorepo root (web-seo/)
# =============================================================================

# ── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
# openssl: required by Prisma; libc6-compat: native Node.js module compat
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

# ── Stage 2: install ALL deps (devDeps needed for build: TS, Prisma CLI) ─────
FROM base AS deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# ── Stage 3: install PRODUCTION-ONLY deps (for slim runner image) ────────────
FROM base AS prod-deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
# Ensure workspace dirs exist — npm may not create them if all packages hoist
# to root node_modules, which would cause the COPY in runner stage to fail.
RUN mkdir -p apps/api/node_modules
RUN npm ci --omit=dev

# ── Stage 4: build ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY turbo.json ./

# Build @seopen/shared first (API depends on it)
RUN npm run build --workspace=packages/shared
# Generate Prisma client (uses devDep prisma CLI — must be in deps stage)
RUN cd apps/api && npx prisma generate
# Build NestJS API
RUN npm run build --workspace=apps/api

# ── Stage 5: production runtime ──────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Non-root user for container security
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Root node_modules: hoisted workspace prod deps + .prisma generated client
COPY --from=prod-deps /repo/node_modules ./node_modules

# Copy .prisma generated client from builder (it was generated with devDeps)
# Overwrite only the .prisma directory to preserve prod-only node_modules
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma

# @seopen/shared runtime files
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder /repo/packages/shared/package.json ./packages/shared/package.json

# API compiled output + scoped node_modules (prod only)
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json

# Prisma schema + migrations (needed by migrate deploy at startup)
COPY --from=builder /repo/apps/api/prisma ./apps/api/prisma

# Entrypoint (plain sh — no bash dependency needed)
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

RUN chown -R nestjs:nodejs /repo
USER nestjs

WORKDIR /repo/apps/api

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/health | grep -q 'ok' || exit 1

EXPOSE 4000
ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "dist/main"]

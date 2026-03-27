# =============================================================================
# SEOPen — Combined Single-Container Dockerfile
# Runs Next.js (port 3000) + NestJS API (port 4000) in one image
# Build context: monorepo root (web-seo/)
#
# Architecture:
#   Browser → https://your-domain.com → Traefik → :3000 (Next.js)
#   Next.js rewrites /api/v1/* → http://localhost:4000 (NestJS, internal only)
#
# Usage (Dokploy): point Compose file to docker-compose.dokploy.yml
# =============================================================================

# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
# openssl: Prisma; libc6-compat: native addon compat
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

# ── Stage 2: all deps (devDeps needed to build TS + Prisma CLI) ───────────────
FROM base AS deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json        ./apps/api/
COPY apps/web/package*.json        ./apps/web/
RUN npm ci

# ── Stage 3: prod-only deps (slim runtime, no devDeps) ────────────────────────
FROM base AS prod-deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json        ./apps/api/
COPY apps/web/package*.json        ./apps/web/
# Ensure workspace dirs exist — npm may hoist all packages to root node_modules,
# leaving these empty. The runner stage COPY would fail without them.
RUN mkdir -p apps/api/node_modules apps/web/node_modules
RUN npm ci --omit=dev

# ── Stage 4: build everything ─────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/api        ./apps/api
COPY apps/web        ./apps/web
COPY turbo.json      ./

# 1. Build shared package (both API and Web depend on it)
RUN npm run build --workspace=packages/shared

# 2. Generate Prisma client (requires devDep prisma CLI)
RUN cd apps/api && npx prisma generate

# 3. Build NestJS API
RUN npm run build --workspace=apps/api

# 4. Build Next.js (NEXT_PUBLIC_* baked into JS bundle at build time)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN mkdir -p apps/web/public
RUN npm run build --workspace=apps/web

# ── Stage 5: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production

# Non-root user for container security
RUN addgroup -S nodejs && adduser -S appuser -G nodejs

# ── API workspace layout (preserved for module resolution) ────────────────────
WORKDIR /repo

# Hoisted prod node_modules + .prisma generated client
COPY --from=prod-deps /repo/node_modules      ./node_modules
COPY --from=builder   /repo/node_modules/.prisma ./node_modules/.prisma

# Prisma CLI binary (devDep — needed only for `migrate deploy` at startup)
COPY --from=builder /repo/node_modules/.bin/prisma   ./node_modules/.bin/prisma
COPY --from=builder /repo/node_modules/prisma        ./node_modules/prisma

# Shared package runtime
COPY --from=builder /repo/packages/shared/dist        ./packages/shared/dist
COPY --from=builder /repo/packages/shared/package.json ./packages/shared/package.json

# API compiled output + scoped node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder   /repo/apps/api/dist         ./apps/api/dist
COPY --from=builder   /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder   /repo/apps/api/prisma       ./apps/api/prisma

# ── Web (Next.js standalone — fully self-contained) ───────────────────────────
# standalone output preserves the monorepo tree, server.js at apps/web/server.js
COPY --from=builder /repo/apps/web/.next/standalone /web/
COPY --from=builder /repo/apps/web/.next/static     /web/apps/web/.next/static
COPY --from=builder /repo/apps/web/public           /web/apps/web/public

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

RUN chown -R appuser:nodejs /repo /web
USER appuser

# Only port 3000 is exposed to Traefik — port 4000 stays internal
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000 -S 2>&1 | grep -q "200\|301\|302" || exit 1

ENTRYPOINT ["docker-entrypoint"]

# =============================================================================
# SEOPen Web — Multi-stage Dockerfile
# Build context: monorepo root (web-seo/)
# Requires next.config.js: output: 'standalone'
# =============================================================================

# ── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo

# ── Stage 2: install all deps (cached unless manifests change) ───────────────
FROM base AS deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# ── Stage 3: build ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY turbo.json ./

# Build @seopen/shared first
RUN npm run build --workspace=packages/shared

# NEXT_PUBLIC_* vars must be available at BUILD time (baked into JS bundles)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build --workspace=apps/web

# ── Stage 4: production runtime (Next.js standalone) ─────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for container security
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output preserves the monorepo directory tree inside it,
# so server.js lives at apps/web/server.js within the standalone bundle.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static

# Copy public folder (images, favicons, robots.txt, etc.)
COPY --from=builder /repo/apps/web/public ./apps/web/public

RUN chown -R nextjs:nodejs /app
USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000 -S 2>&1 | grep -q "200\|301\|302" || exit 1

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "server.js"]

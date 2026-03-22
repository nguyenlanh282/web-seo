#!/bin/sh
# =============================================================================
# SEOPen — Combined entrypoint
# Runs: prisma migrate → NestJS API (:4000) + Next.js Web (:3000)
# Port 4000 is internal only — Traefik routes all traffic to port 3000
# Next.js rewrites /api/v1/* → http://localhost:4000
# =============================================================================
set -e

# ── 1. Database migration (must complete before API starts) ───────────────────
echo "▶ Running database migrations..."
/repo/node_modules/.bin/prisma migrate deploy \
  --schema=/repo/apps/api/prisma/schema.prisma
echo "✅ Migrations done"

# ── 2. Start NestJS API on port 4000 (background) ────────────────────────────
echo "▶ Starting API on :4000..."
node /repo/apps/api/dist/main &
API_PID=$!

# ── 3. Start Next.js Web on port 3000 (background) ───────────────────────────
echo "▶ Starting Web on :3000..."
PORT=3000 HOSTNAME=0.0.0.0 node /web/apps/web/server.js &
WEB_PID=$!

echo "✅ Both services started — API pid=$API_PID | Web pid=$WEB_PID"

# ── 4. Forward SIGTERM/SIGINT to both children ────────────────────────────────
trap 'echo "⏹ Shutting down..."; kill $API_PID $WEB_PID 2>/dev/null; wait $API_PID $WEB_PID 2>/dev/null; exit 0' TERM INT

# ── 5. Monitor — exit container if either process dies ───────────────────────
while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "❌ API process (pid=$API_PID) exited — stopping container"
    kill "$WEB_PID" 2>/dev/null
    exit 1
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "❌ Web process (pid=$WEB_PID) exited — stopping container"
    kill "$API_PID" 2>/dev/null
    exit 1
  fi
  sleep 5
done

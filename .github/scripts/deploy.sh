#!/bin/sh
# =============================================================================
# SEOPen — VPS Deploy Script
# Called by cd.yml via appleboy/ssh-action script_path
#
# Env vars injected by CI:
#   COMMIT_SHA               Full git SHA of the commit being deployed
#   GITHUB_ACTOR             GitHub username (for GHCR login)
#   GITHUB_REPOSITORY_OWNER  GitHub org/user (GHCR image prefix)
#   GHCR_PAT                 read:packages PAT for GHCR pull on VPS
#   DEPLOY_PATH              Absolute path on VPS e.g. /opt/seopen
# =============================================================================
set -euo pipefail

DEPLOY_TAG="sha-$(echo "$COMMIT_SHA" | cut -c1-7)"
GHCR_OWNER="$GITHUB_REPOSITORY_OWNER"
TARGET="${DEPLOY_PATH:-/opt/seopen}"

echo "── Deploying $DEPLOY_TAG to $TARGET ──"
cd "$TARGET"

# Authenticate VPS to GHCR (PAT is rotatable independently of GITHUB_TOKEN)
echo "$GHCR_PAT" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# Pull new images before stopping old ones (minimises downtime)
DEPLOY_TAG="$DEPLOY_TAG" GHCR_OWNER="$GHCR_OWNER" docker compose pull api web

# Restart containers — entrypoint runs `prisma migrate deploy` before starting
DEPLOY_TAG="$DEPLOY_TAG" GHCR_OWNER="$GHCR_OWNER" docker compose up -d --remove-orphans api web

# Wait for API health (max 60s = 12 × 5s)
echo "Waiting for API health..."
HEALTHY=false
for i in $(seq 1 12); do
  STATUS=$(docker compose ps api --format json 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('Health','starting'))" 2>/dev/null \
    || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    echo "✅ API healthy"
    HEALTHY=true
    break
  fi
  echo "  [$i/12] $STATUS — waiting 5s..."
  sleep 5
done

# Rollback to :latest tag if new containers are not healthy
if [ "$HEALTHY" = "false" ]; then
  echo "❌ Health check failed — rolling back to :latest"
  DEPLOY_TAG="latest" GHCR_OWNER="$GHCR_OWNER" docker compose up -d api web
  echo "⚠️  Investigate with: docker compose logs api"
  exit 1
fi

docker compose ps

# Clean up dangling images (keeps disk usage low on VPS)
docker image prune -f

echo "🚀 Deployed $DEPLOY_TAG successfully"

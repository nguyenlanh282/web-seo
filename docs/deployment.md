# Deployment Guide — SEOPen

## Architecture

```
GitHub Push → CI (lint/typecheck) → Build & Push GHCR → SSH Deploy VPS
```

- **Registry:** `ghcr.io/nguyenlanh282/seopen-api` + `seopen-web`
- **Tags:** `sha-<short>` (per deploy) + `latest`
- **Server:** Any Linux VPS with Docker + Docker Compose v2

---

## 1. VPS Setup (one-time)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER   # add deploy user to docker group

# Create app directory
mkdir -p /opt/seopen
cd /opt/seopen

# Copy docker-compose.yml from repo
# Copy .env from .env.example and fill in values
cp .env.example .env
nano .env
```

**.env required values on VPS:**
```env
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
ENCRYPTION_KEY=<openssl rand -base64 32>
ANTHROPIC_API_KEY=sk-ant-...
SERP_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CORS_ORIGINS=https://your-domain.com
FRONTEND_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## 2. GitHub Secrets Setup

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

### Secrets (sensitive)

| Secret | Value |
|--------|-------|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH username (e.g. `ubuntu`, `deploy`) |
| `SSH_PRIVATE_KEY` | Private SSH key (contents of `~/.ssh/id_ed25519`) |
| `SSH_PORT` | SSH port — optional, defaults to `22` |
| `DEPLOY_PATH` | Absolute path on VPS, e.g. `/opt/seopen` |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope ([create here](https://github.com/settings/tokens)) |

### Variables (non-sensitive, baked into Next.js bundle)

Go to: **Settings → Secrets and variables → Variables**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | e.g. `https://api.your-domain.com` |
| `NEXT_PUBLIC_POSTHOG_KEY` | optional |
| `NEXT_PUBLIC_SENTRY_DSN` | optional |

---

## 3. SSH Key Setup

Generate a dedicated deploy key (no passphrase):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/seopen_deploy -N ""

# Add public key to VPS
ssh-copy-id -i ~/.ssh/seopen_deploy.pub user@your-vps

# Add PRIVATE key content to GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/seopen_deploy
```

---

## 4. GitHub PAT for GHCR Pull

1. Go to https://github.com/settings/tokens → **Generate new token (classic)**
2. Scopes: `read:packages` only
3. Copy token → add as `GHCR_PAT` GitHub Secret

> **Note:** This token allows the VPS to pull Docker images from GHCR. Rotate it periodically.

---

## 5. GitHub Environment Protection (optional)

Go to: **Settings → Environments → production**

- Add **required reviewers** to gate deploys behind approval
- Add **wait timer** (e.g. 5 min) for staged rollouts

---

## 6. First Deploy

```bash
# On VPS — pull and start infrastructure first (postgres + redis)
cd /opt/seopen
docker compose pull postgres redis
docker compose up -d postgres redis

# Wait for health checks, then push to master to trigger CD
```

---

## 7. Manual Rollback

```bash
cd /opt/seopen

# List available images
docker images | grep seopen

# Roll back to a specific sha tag
DEPLOY_TAG=sha-abc1234 GHCR_OWNER=nguyenlanh282 \
  docker compose up -d api web

# Or roll back to latest stable
DEPLOY_TAG=latest GHCR_OWNER=nguyenlanh282 \
  docker compose up -d api web
```

---

## 8. CI/CD Workflow Summary

```
Every push or PR:
  └── ci: npm ci → build shared → typecheck API + Web → lint API + Web

Push to master/main (after ci passes):
  ├── build/api: docker build → push ghcr.io/.../seopen-api:sha-xxx + :latest
  ├── build/web: docker build → push ghcr.io/.../seopen-web:sha-xxx + :latest  (parallel)
  └── deploy (after both builds):
        SSH → docker compose pull api web
            → docker compose up -d (entrypoint runs prisma migrate deploy)
            → health check loop (max 60s)
            → docker image prune -f
```

**Build cache:** GitHub Actions cache (GHA) per app — subsequent builds are ~3x faster.

---

## 9. Logs & Monitoring

```bash
# Real-time logs
docker compose logs -f api
docker compose logs -f web

# Container status
docker compose ps

# API health
curl http://localhost:4000/health
```

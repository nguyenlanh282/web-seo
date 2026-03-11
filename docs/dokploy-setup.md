# Dokploy Deployment Guide

## Overview

Dokploy builds images directly from Dockerfiles on every push — no GHCR or external registry needed.

```
GitHub Push → Dokploy webhook → docker compose build → deploy
```

---

## 1. Install Dokploy on VPS

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy UI opens at `http://<VPS_IP>:3000`. Create admin account on first visit.

---

## 2. Create Compose Application

1. **Dokploy UI → Projects → New Project → Create**
2. **Applications → Create Application**
3. Select type: **Compose**
4. Fill in:
   - Name: `seopen`
   - Source: **GitHub**
   - Repository: `nguyenlanh282/web-seo`
   - Branch: `master`
   - **Compose file path**: `docker-compose.dokploy.yml`
5. Click **Save**

---

## 3. Set Environment Variables

In the application → **Environment** tab, paste all variables:

```env
# Database
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>

# JWT (generate: openssl rand -base64 64)
JWT_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>

# Encryption (generate: openssl rand -base64 32)
ENCRYPTION_KEY=<32-char-random>

# AI
ANTHROPIC_API_KEY=sk-ant-...
SERP_API_KEY=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App URLs (replace with your domain)
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Optional
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_SENTRY_DSN=
```

> ⚠️ `NEXT_PUBLIC_API_URL` is baked into the Next.js bundle at **build time** — set this before first deploy.

---

## 4. Configure Domains

In **Domains** tab, add two domains:

| Service | Domain | Port |
|---------|--------|------|
| `api` | `api.your-domain.com` | `4000` |
| `web` | `your-domain.com` | `3000` |

Dokploy provisions Let's Encrypt SSL automatically via Traefik.

---

## 5. Enable Auto-Deploy

In **General** tab:
- ✅ **Auto Deploy** → ON
- Dokploy installs a GitHub webhook automatically
- Every push to `master` triggers a rebuild and redeploy

---

## 6. First Deploy

Click **Deploy** button → Dokploy will:
1. Pull source from GitHub
2. `docker compose build` (API ~5 min, Web ~4 min on first run)
3. Start postgres + redis (infrastructure first)
4. Start api (runs `prisma migrate deploy` automatically via entrypoint)
5. Start web (after api passes health check)

Monitor progress in **Logs** tab.

---

## 7. CI Integration (optional)

Keep GitHub Actions for lint/typecheck on PRs, let Dokploy handle CD:

In `.github/workflows/ci-cd.yml`, the `build` and `deploy` jobs won't conflict because they require `SSH_HOST` secret — if not set, those jobs will fail gracefully. To cleanly separate, you can disable the build+deploy jobs when using Dokploy:

```yaml
# In ci-cd.yml, add condition to build job:
if: github.event_name == 'push' && secrets.SSH_HOST != ''
```

Or just keep `ci.yml` only (lint+typecheck) and delete the CD jobs entirely.

---

## 8. Rollback

In Dokploy UI → **Deployments** tab:
- See all deployment history
- Click any past deployment → **Redeploy** to roll back

---

## 9. Useful Commands on VPS

```bash
# View running containers
docker ps

# Live logs for API
docker logs -f $(docker ps -qf name=seopen_api)

# Manual restart
cd /path/to/dokploy/app
docker compose -f docker-compose.dokploy.yml restart api

# Check API health
curl http://localhost:4000/health
```

---

## Build Time Estimates

| Service | Cold build | With cache |
|---------|-----------|------------|
| `api` | ~4 min | ~1.5 min |
| `web` | ~5 min | ~2 min |

Dokploy caches Docker layers between builds — subsequent deploys are significantly faster.

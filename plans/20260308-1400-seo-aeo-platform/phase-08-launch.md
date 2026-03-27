# Phase 08 - Launch Readiness
> Week 11 | Priority: P0 | Status: Planned

## Context Links
- Previous phase: [phase-06-publish-enforcement.md](./phase-06-publish-enforcement.md)
- Master plan: [plan.md](./plan.md)

---

## Overview
Final pre-launch phase. Ensure the platform is production-ready with E2E testing,
monitoring, performance optimization, and Dokploy deployment verification.

---

## Todo List

### 1. Dokploy Deployment Verification
- [ ] Verify `docker-compose.dokploy.yml` builds successfully on Dokploy
- [ ] Configure domains: `web.vps-enzara-2.enzara.com.vn` + `api.vps-enzara-2.enzara.com.vn`
- [ ] Set all env vars in Dokploy UI (from `.env.example`)
- [ ] SSL/TLS via Traefik (auto Let's Encrypt)
- [ ] Health checks pass for api (`:4000/health`) and web (`:3000`)
- [ ] Verify Prisma `migrate deploy` runs on API startup
- [ ] Test auto-deploy on GitHub push

### 2. VPS Setup (SSH Deploy)
- [ ] Create `/opt/seopen` directory on VPS
- [ ] Copy `docker-compose.yml` + `.env` to VPS
- [ ] Verify SSH key from GitHub Actions can connect
- [ ] Test CD pipeline: CI pass → CD build → GHCR push → VPS deploy
- [ ] Verify rollback in `deploy.sh` works on health check failure

### 3. End-to-End Smoke Test
- [ ] Full flow: Register → Create Project → Create Article → Step 1-5 → WP Publish
- [ ] Verify Google OAuth login works with production callback URL
- [ ] Test WP connection: add site → test → save → publish article
- [ ] Verify SSE progress events display correctly in browser
- [ ] Test plan limits: create articles until credit exhausted → verify 403
- [ ] Test rate limiting: rapid requests → verify 429 with countdown

### 4. Database & Backup
- [ ] PostgreSQL backup script (daily cron on VPS)
- [ ] Test backup → restore procedure
- [ ] Redis AOF persistence enabled
- [ ] Verify Prisma migrations are up-to-date

### 5. Monitoring & Observability
- [ ] `/health` endpoint returns service status (DB + Redis + Queue)
- [ ] Sentry DSN configured (API + Web)
- [ ] PostHog configured with production key
- [ ] Uptime monitoring (UptimeRobot or similar) on `/health`
- [ ] Log rotation for Docker containers

### 6. Security Hardening
- [ ] CSP headers verified (no unsafe-eval in production)
- [ ] CORS_ORIGINS set to production domain only
- [ ] ENCRYPTION_KEY, JWT secrets are strong (not defaults)
- [ ] Rate limiting active on all public endpoints
- [ ] No `.env` files committed to git
- [ ] Security headers pass Mozilla Observatory (A grade target)

### 7. Performance
- [ ] Next.js bundle size audit (`next build` output)
- [ ] API response times: < 200ms for CRUD, < 5s for AI steps
- [ ] Database: add indexes for common queries
- [ ] Redis: connection pooling configured
- [ ] Docker images: verify multi-stage builds are slim

### 8. Documentation
- [ ] API docs: Swagger UI accessible at `/api/docs`
- [ ] Environment setup guide for new developers
- [ ] Deployment runbook (Dokploy + SSH fallback)

---

## Success Criteria
- Full E2E flow completes without errors on production
- Docker images build and deploy in < 10 minutes
- API health check passes within 40s of container start
- All security headers present (CSP, X-Frame-Options, etc.)
- Backup/restore tested and documented
- Auto-deploy triggers on `git push master`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dokploy build OOM on VPS | Medium | High | Set `--memory` limit, use swap, build on GH Actions |
| SSL cert provisioning fails | Low | High | Pre-validate domain DNS, fallback to manual cert |
| Data loss on first deploy | Low | Critical | Backup DB before deploy, test migration on staging |
| GHCR token expired | Medium | Medium | Document PAT renewal, add expiry alert |

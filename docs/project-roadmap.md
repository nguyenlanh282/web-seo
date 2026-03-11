# Project Roadmap — Vietnamese SEO/AEO SaaS Platform

> **Last Updated**: 2026-03-10 | **Phase Status**: 5/6 In Progress

---

## 📊 Current Status Overview

| Phase | Status | Completion | Notes |
|-------|--------|-----------|-------|
| Phase 1 | ✅ Done | 100% | Foundation (Monorepo, Auth, DB) |
| Phase 2 | ✅ Done | 100% | AI Engine (BullMQ, SSE, SerpAPI) |
| Phase 3 | ✅ Done | 100% | Editor (TipTap, Steps 2-3) |
| Phase 4 | ✅ Done | 100% | SEO Checker (12-item checklist) |
| Phase 5 | 🔄 In Progress | ~90% | Export & WordPress (Step 5) |
| Phase 6 | 🔄 In Progress | ~70% | Hardening & Rate Limiting |
| **Total** | | **~83%** | Launch target: ~2 weeks |

---

## ✅ What Was Completed This Session

### Phase 5 Improvements (~90% → completing)

**Bug Fixes & Features:**
- ✅ **Enum Handling**: PARTIAL status added to ExportHistory (tracking WP post creation failures)
- ✅ **retryPublish() Fixed**: Idempotency check now prevents duplicate WordPress posts on retry
- ✅ **WP Processor Tracking**: Partial failure handling added (wpPostId stored even if DB update fails)

**Current Implementation:**
- AES-256-GCM encryption service fully working
- WordPress REST API integration (Basic Auth via App Passwords)
- HTML export template with semantic HTML
- Internal link suggestion engine (Jaccard similarity on keywords)
- Redis lock prevents duplicate publishes (120s TTL)

### Phase 6 Progress (~70%)

**Completed:**
- ✅ **GlobalExceptionFilter**: Structured error responses (code, message, upgradeUrl)
- ✅ **PlanErrorProvider**: Countdown logic added for rate limit retryAfter
- ✅ **PostHog Analytics**:
  - `article_created` event
  - `step_completed(step)` event
  - `published` event with plan tier
  - User properties tracked (plan, articleCreditsRemaining)

**Partially Implemented:**
- 🔄 RateLimitGuard (Redis sorted set sliding window) — core logic done
- 🔄 PlanGuard + CreditService (Lua atomic deduction) — framework ready
- 🔄 Monthly credit reset cron — schema ready

---

## 🚀 Remaining Work (Phase 6 Open Items)

### Critical Security Items

| Item | Priority | Status | Effort | Notes |
|------|----------|--------|--------|-------|
| JWT in SSE URL | P0 | ⏳ Pending | 2h | Currently auth via Bearer header; SSE URL needs token for reconnect scenarios |
| HttpOnly Cookies | P0 | ⏳ Pending | 3h | Replace refresh token in localStorage with HttpOnly secure cookie |
| SSRF Protection on WP URL | P0 | ⏳ Pending | 2h | Validate WP site URLs before storage (block localhost, private IPs) |

### Feature Completion

| Component | Remaining Tasks | Est. Time |
|-----------|-----------------|-----------|
| **Rate Limiting** | Apply @RateLimit to all endpoints; E2E test 429s | 4h |
| **Plan Gates** | Frontend disable CTA at limits; upgrade modal UI | 3h |
| **Publish Pipeline** | POST /retry-publish for PARTIAL/FAILED; BullMQ backoff | 2h |
| **Frontend Banners** | Credit counter in header; PlanLimitBanner component | 2h |
| **Testing** | End-to-end keyword→publish test; load test (10 users) | 4h |

---

## 📅 Next Immediate Steps (Priority Order)

### Day 1: Security Hardening
```
1. JWT in SSE URL — wrap token in URL query param (encrypted or signed)
2. HttpOnly Cookies — migrate NextAuth refresh token storage
3. SSRF Protection — add URL whitelist validation + regex for WP domain
```

### Day 2: Rate Limiting & Plan Gates
```
1. Apply @RateLimit() decorator to: /step1, /step2, /step3, /ai-action, /publish-wp
2. Frontend: disable "New Article" button when articleCredits = 0
3. Upgrade modal: show plan comparison table (Starter vs Pro vs Agency)
```

### Day 3: Pipeline Completion
```
1. POST /articles/:id/retry-publish endpoint (idempotent, checks ExportHistory.status)
2. BullMQ config: 3 retries, exponential backoff (30s, 60s, 120s)
3. Frontend: "Retry" button for PARTIAL/FAILED publish states
```

### Day 4-5: QA & Polish
```
1. End-to-end test: keyword → outline → content → SEO check → WP publish (~2 min)
2. Load test: 10 concurrent users through full pipeline
3. Security audit: CSP, HSTS, X-Frame-Options headers
4. Verify PostHog events fire correctly in staging
```

---

## 🎯 Success Criteria for Launch

- [ ] All 6 phases complete + tested
- [ ] JWT in SSE URL functional
- [ ] HttpOnly cookies in use (no localStorage tokens)
- [ ] SSRF protection active on WP URL validation
- [ ] Rate limiting enforced (429 on limit exceeded)
- [ ] Plan limits enforced (403 on credit/project limit)
- [ ] End-to-end: keyword→publish in <2 min total
- [ ] Load test: 10 concurrent users, all steps, no errors
- [ ] Security headers pass Mozilla Observatory (A grade)
- [ ] PostHog events populate correctly in dashboard

---

## 📝 Related Documentation

- **Master Plan**: `../plans/20260308-1400-seo-aeo-platform/plan.md`
- **Phase 5 Details**: `../plans/20260308-1400-seo-aeo-platform/phase-05-export-wordpress.md`
- **Phase 6 Details**: `../plans/20260308-1400-seo-aeo-platform/phase-06-publish-enforcement.md`
- **Tech Stack**: `./tech-stack.md`
- **PRD v4**: `../plans/20260308-1400-seo-aeo-platform/seo-aeo-prd_4.md`

---

## 💡 Vietnamese Context Notes

- **Target Market**: Vietnamese digital-marketing agencies, content studios, freelancers
- **SEO Focus**: Vietnamese keyword research via SerpAPI + Claude Sonnet optimizations
- **Content**: Blog posts written in Vietnamese with HTML export → WordPress integration
- **State Machine**: DRAFT → KEYWORD_ANALYZED → OUTLINED → CONTENT_WRITTEN → SEO_CHECKED → EXPORTED → PUBLISHED

---

## 🔧 Environment Variables Checklist

```bash
# Phase 5-6 Requirements
ENCRYPTION_KEY=<64-hex-chars>        # AES-256-GCM key for WP credentials
NEXTAUTH_SECRET=<random>              # NextAuth session secret
GOOGLE_CLIENT_ID=<from-gcp>           # Google OAuth
GOOGLE_CLIENT_SECRET=<from-gcp>       # Google OAuth
ANTHROPIC_API_KEY=<from-anthropic>    # Claude Sonnet + Haiku
SERPAPI_KEY=<from-serpapi>            # SERP reverse-engineering
DATABASE_URL=<postgresql-16>          # PostgreSQL connection string
REDIS_URL=<redis-7>                   # Redis for queue + cache + locks
POSTHOG_API_KEY=<from-posthog>        # Event analytics
```

---

**Status**: Most of the heavy lifting is done. Final stretch is security hardening + frontend UX polish. Aim to merge Phase 5-6 to main by end of week, staging testing week 2 of March.

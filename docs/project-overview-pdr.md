# Project Overview — Product Design & Requirements

## Product

**SEOPen** — AI-powered SEO/AEO content writing platform for the Vietnamese market.

One-liner: _Write SEO-optimised Vietnamese blog posts in 5 guided steps, powered by Anthropic Claude._

GitHub: [nguyenlanh282/web-seo](https://github.com/nguyenlanh282/web-seo)

---

## Vision

Enable Vietnamese content writers, marketers, and agencies to produce high-quality, SEO-optimised articles at scale — without deep SEO expertise — by automating the research → outline → write → check → publish pipeline.

---

## Target Users

| Segment | Description |
|---------|-------------|
| Solo bloggers / freelancers | Want fast, quality content with minimal manual SEO work |
| Marketing teams (SMB) | Need 20–100 articles/month for multiple campaigns |
| Digital agencies | Manage 10+ client websites, need bulk publishing & WP integration |

---

## Core Feature Pipeline (5 Steps)

```
[1] Keyword Analysis
      ↓  SERP data via SerpAPI → AI insights (Sonnet)
[2] Outline Generation
      ↓  AI-generated hierarchical H2/H3 outline based on SERP gaps
[3] Content Writing
      ↓  Section-by-section generation via Claude Sonnet
[4] SEO Check
      ↓  12-point weighted checklist → score /100
[5] Export / Publish
      ↓  HTML download  OR  async push to WordPress REST API
```

### Step Details

| Step | Endpoint | Queue | AI Model |
|------|----------|-------|----------|
| 1 — Keyword Analysis | `POST /articles/:id/step1/analyze` | `keyword-analysis` | Claude Sonnet |
| 2 — Outline Generation | `POST /articles/:id/step2` | `outline-generation` | Claude Sonnet |
| 3 — Content Writing | `POST /articles/:id/step3` | `content-writing` | Claude Sonnet |
| 4 — SEO Check | `POST /articles/:id/step4` | _(sync)_ | — |
| 5a — Export HTML | `POST /articles/:id/step5/export` | _(sync)_ | — |
| 5b — WP Publish | `POST /articles/:id/publish-wp` | `wordpress-publish` | — |

### AI Editor Actions (inline, synchronous)

| Action | Description | Model |
|--------|-------------|-------|
| `rewrite` | Rewrite selected text | Claude Haiku |
| `expand` | Expand selected text | Claude Haiku |
| `simplify` | Simplify selected text | Claude Haiku |
| `humanize` | Humanize AI-sounding text | Claude Haiku |

---

## User Plans & Limits

| Feature | STARTER | PRO | AGENCY |
|---------|---------|-----|--------|
| Articles / month | 30 | 100 | 500 |
| Max projects | 2 | 10 | 999 (unlimited) |
| Max WP sites | 0 | 1 | 50 |
| AI req / min | 10 | 20 | 30 |
| AI req / day | 200 | 1,000 | 5,000 |
| Content Gap analysis | ✗ | ✓ | ✓ |
| Full AI editor actions | ✗ | ✓ | ✓ |
| WordPress export | HTML only | Single site | Unlimited |
| Internal links | Manual | Suggested | Auto |

Minimum SEO score required to publish to WordPress: **60 / 100**

---

## SEO Scoring Checklist (12 checks, total = 100)

| Check | Weight | Description |
|-------|--------|-------------|
| `KEYWORD_COVERAGE` | 15 | Keyword density 0.5–3%, distributed across thirds |
| `HEADLINE_KEYWORD` | 12 | Target keyword in article title (bonus: at start) |
| `HEADING_STRUCTURE` | 12 | ≥2 H2s, H2+H3 hierarchy, keyword in ≥1 heading |
| `INTERNAL_EXTERNAL_LINKS` | 12 | ≥2 internal + ≥1 external link |
| `META_DESCRIPTION` | 10 | 120–160 chars, contains keyword |
| `READABILITY` | 10 | Vietnamese Flesch score ≥ 60 |
| `IMAGE_ALT` | 6 | ≥80% images have alt text; ≥1 contains keyword |
| `ANCHOR_TEXT` | 5 | ≥80% descriptive anchors; keyword in ≥1 anchor |
| `CONTENT_LENGTH` | 5 | ≥800 words (ideal ≥1,500) |
| `CONTENT_GAP_COVERAGE` | 5 | ≥40% of SERP-derived related terms covered |
| `IMAGE_FILENAME` | 4 | ≥50% descriptive filenames; ≥1 contains keyword |
| `TAGS` | 4 | ≥3 associated keywords; ≥1 marked primary |

---

## API Integrations

| Service | Purpose | Auth |
|---------|---------|------|
| **Anthropic Claude** | Outline generation, content writing, AI editor actions | `ANTHROPIC_API_KEY` env or per-user encrypted key |
| **SerpAPI** | SERP data for keyword analysis (PAA, related searches, top results) | `SERP_API_KEY` env or per-user encrypted key |
| **WordPress REST API** | Publish articles as draft posts via `wp/v2/posts` | Application Password (AES-256-GCM encrypted at rest) |
| **Google OAuth 2.0** | Social login (email + profile scope) | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |

---

## Non-Functional Requirements

### Security
- All tokens delivered via **HttpOnly cookies only** — never in URL or response body
- WordPress credentials encrypted with **AES-256-GCM** before DB storage
- Anthropic / SerpAPI keys stored encrypted per-user in DB
- **SSRF protection** on WordPress URL: blocks RFC-1918, loopback, IPv6 ULA/link-local — validated at both registration and publish time
- **HTML sanitization** using `sanitize-html` allowlist before export/publish (immune to nested tags, CSS expressions, `javascript:` URI bypass)
- Helmet CSP on API; `sameSite: strict` on access token cookie, `sameSite: lax` on refresh cookie
- Global `ThrottlerModule`: 100 req / 60 s per client

### Performance
- Long AI jobs (outline, content, WP publish) are async via **BullMQ** — never block HTTP request
- **Idempotency keys** in Redis prevent duplicate job enqueue on retry
- **Sliding-window rate limit** via Lua script (atomic, no TOCTOU)
- Article credit deduction via **Lua script** (atomic Redis DECRBY + async DB sync)
- SERP results cached in Redis (`serp:cache:<keyword>`) to avoid redundant API calls
- SSE streams keyed `userId:articleId`; stale streams (>10 min) auto-cleaned

### Observability
- **Sentry** error tracking (5xx only in prod, `tracesSampleRate: 0.1`)
- **PostHog** product analytics (page views, step completions, AI actions, exports)
- `/health` endpoint (uptime, version, timestamp) for Docker health checks
- Swagger UI at `/api/docs` (dev only)

### Reliability
- BullMQ retry: outline (3 attempts, exponential), content (2 attempts, exponential), WP publish (2 attempts, fixed 5 s)
- WP publish **distributed lock** (UUID token, 150 s TTL) prevents double-enqueue; Lua `GET+DEL` prevents ghost release
- WP publish **PARTIAL state**: if WP post created but DB sync fails, `ExportHistory.status = PARTIAL` is recorded so user can retry
- Monthly credit reset via `@Cron('0 0 1 * *')` with batch processing (50 users/batch)

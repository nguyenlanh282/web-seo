# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  Next.js 14 (App Router)  +  TipTap  +  React Query  +  Zustand│
│  axios (withCredentials) — HttpOnly cookies for auth            │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NESTJS API  :4000                           │
│  GlobalExceptionFilter  ·  ResponseInterceptor                  │
│  JwtAuthGuard  ·  PlanGuard  ·  RateLimitGuard                  │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  auth    │ │ articles │ │ keywords │ │  wordpress       │   │
│  │ projects │ │   seo    │ │   jobs   │ │  users / credits │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│                     │ enqueue             │ enqueue             │
└─────────────────────┼─────────────────────┼─────────────────────┘
                      │                     │
            ┌─────────▼─────────────────────▼────────┐
            │              REDIS  :6379               │
            │  BullMQ queues · rate limits · locks    │
            │  SSE tickets  · SERP cache · credits    │
            └──────┬─────────────────────────┬────────┘
                   │ dequeue                  │ dequeue
     ┌─────────────▼──────────┐  ┌───────────▼──────────────┐
     │  AI Queue Workers      │  │  WP Publish Worker        │
     │  keyword-analysis      │  │  wordpress-publish        │
     │  outline-generation    │  │  (SSRF check + decrypt    │
     │  content-writing       │  │   creds + axios to WP)    │
     │  (Claude Sonnet/Haiku) │  └──────────┬───────────────┘
     └─────────────┬──────────┘             │
                   │ SSE progress            │ SSE progress
                   ▼                         ▼
     ┌─────────────────────────────────────────────────────┐
     │            POSTGRESQL  :5432                        │
     │  User · Project · Article · Keyword · WpSite        │
     │  SeoChecklist · AILog · ExportHistory · JobLog      │
     └─────────────────────────────────────────────────────┘
```

---

## Request Flow (typical article API call)

```
Browser
  │ POST /api/v1/articles/:id/step2  (cookie: access_token)
  ▼
NestJS Pipeline
  1. cookieParser          → extract access_token cookie
  2. JwtStrategy           → verify JWT, attach req.user
  3. PlanGuard             → check plan limits / deduct credit
  4. ValidationPipe        → validate + transform DTO
  5. ArticlesController    → call ArticlesService.generateOutline()
  6. ArticlesService
     a. findOne()          → verify ownership (DB)
     b. idempotency check  → redis.get(idempotency key)
     c. outlineQueue.add() → BullMQ enqueue
     d. redis.setex()      → set idempotency key (1h TTL)
  7. ResponseInterceptor   → wrap in { data, meta }
  ▼
Browser receives { data: { jobId: "..." }, meta: { timestamp: ... } }
  │
  │ POST /api/v1/jobs/sse-ticket
  │   → Redis SET sse:ticket:<uuid> userId EX 30
  │ new EventSource(/jobs/stream/:articleId?ticket=<uuid>)
  │   → Redis GETDEL sse:ticket:<uuid>   ← atomic, one-time
  │   → SseService.getStream(articleId, userId)
  ▼
SSE stream open: PROGRESS(10%) → PROGRESS(30%) → ... → COMPLETED(100%)
```

---

## Auth Flow

### Email/Password Login
```
POST /auth/login  { email, password }
  ├─ LocalStrategy.validate() → bcrypt.compare()
  ├─ AuthService.login()      → generateTokens() (JWT 15m + 7d)
  ├─ storeRefreshTokenHash()  → bcrypt.hash(refreshToken, 10) → DB
  ├─ res.cookie('access_token',  ..., httpOnly, sameSite: strict, maxAge: 15min)
  └─ res.cookie('refresh_token', ..., httpOnly, sameSite: lax,    maxAge: 7d)
     (both tokens stripped from response body)
```

### Access Token Refresh
```
POST /auth/refresh   (cookie: refresh_token)
  ├─ jwtService.verify(refreshToken, JWT_REFRESH_SECRET) → extract sub
  ├─ AuthService.refreshToken(userId, incomingToken)
  │    ├─ load user.refreshTokenHash from DB
  │    └─ bcrypt.compare(incomingToken, hash)  → new token pair
  └─ set new cookies  (response body: { ok: true })

Frontend auto-refresh:
  401 response → isRefreshing lock → POST /auth/refresh
              → queue pending requests → retry all on success
              → redirect /login on failure
```

### Google OAuth Flow
```
GET /auth/google             → GoogleAuthGuard → redirect to Google consent
GET /auth/google/callback    → GoogleAuthGuard.validate()
  ├─ find-or-create User in DB (googleId + email)
  ├─ AuthService.login()     → JWT token pair
  ├─ set HttpOnly cookies
  └─ redirect to ${FRONTEND_URL}/auth/callback
        (NO token in URL — frontend calls GET /auth/me to hydrate session)
```

---

## Article Lifecycle — State Machine

```
         ┌──────────────────────────────────────────────────────────┐
         │                                                          │
    ┌────▼────┐    step 1    ┌──────────────────┐                   │
    │  DRAFT  ├─────────────►│ KEYWORD_ANALYZED  │                  │
    └─────────┘              └────────┬──────────┘                  │
                                      │ step 2                      │
                                      ▼                             │
                             ┌─────────────────┐                    │
                          ◄──┤    OUTLINED      ├──►               │
                   (back)    └────────┬────────┘  (back)            │
                                      │ step 3                      │
                                      ▼                             │
                             ┌─────────────────────┐               │
                          ◄──┤   CONTENT_WRITTEN    ├──►            │
                   (back)    └────────┬────────────┘  (back)        │
                                      │ step 4                      │
                                      ▼                             │
                             ┌─────────────────┐                    │
                          ◄──┤   SEO_CHECKED    ├──►               │
                   (back)    └────────┬────────┘  (back)            │
                                      │ step 5a (export HTML)       │
                                      ▼                             │
                             ┌─────────────────┐                    │
                          ◄──┤    EXPORTED      ├──►               │
                   (back)    └────────┬────────┘  (back to         │
                                      │             SEO_CHECKED)    │
                                      │ step 5b (publish WP)        │
                                      ▼                             │
                             ┌─────────────────┐                    │
                             │    PUBLISHED     ├────────────────────┘
                             └─────────────────┘  (back to EXPORTED)
```

**Valid transitions** (enforced by `assertTransition()` in `state-machine.ts`):

| From | To |
|------|----|
| `DRAFT` | `KEYWORD_ANALYZED` |
| `KEYWORD_ANALYZED` | `DRAFT`, `OUTLINED` |
| `OUTLINED` | `KEYWORD_ANALYZED`, `CONTENT_WRITTEN` |
| `CONTENT_WRITTEN` | `OUTLINED`, `SEO_CHECKED` |
| `SEO_CHECKED` | `CONTENT_WRITTEN`, `EXPORTED` |
| `EXPORTED` | `SEO_CHECKED`, `PUBLISHED` |
| `PUBLISHED` | `EXPORTED` |

---

## BullMQ Queue Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Redis (BullMQ backing store)                                  │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐             │
│  │  keyword-analysis   │  │  outline-generation  │             │
│  │  job: analyze       │  │  job: generate       │             │
│  │  retries: 3 (exp)   │  │  retries: 3 (exp 1s) │             │
│  └──────────┬──────────┘  └──────────┬───────────┘            │
│             │                        │                         │
│  ┌──────────▼──────────┐  ┌──────────▼───────────┐            │
│  │  KeywordAnalysis    │  │  OutlineGenerator    │            │
│  │  Processor          │  │  Processor           │            │
│  └─────────────────────┘  └──────────────────────┘            │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐             │
│  │  content-writing    │  │  wordpress-publish   │             │
│  │  job: write         │  │  job: publish        │             │
│  │  retries: 2 (exp 2s)│  │  retries: 2 (fix 5s) │            │
│  │  timeout: 180s      │  │  timeout: 120s       │             │
│  └──────────┬──────────┘  └──────────┬───────────┘            │
│             │                        │                         │
│  ┌──────────▼──────────┐  ┌──────────▼───────────┐            │
│  │  ContentWriter      │  │  WpPublish           │            │
│  │  Processor          │  │  Processor           │            │
│  └─────────────────────┘  └──────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

All processors emit SSE events via `SseService` throughout processing.

---

## WP Publish Lock Mechanism

```
ArticlesService.publishToWordPress()
  │
  ├─ redis.acquireLock(publish:lock:<articleId>, 150s)
  │      → SET key <uuid> EX 150 NX
  │      → returns lockToken (UUID) or null
  │
  ├─ if null → throw ConflictException (409) — job already in progress
  │
  ├─ wpPublishQueue.add('publish', { ..., lockToken })
  │      ← lockToken passed into job data
  │
  └─ on enqueue failure → releaseLock(key, lockToken) immediately
       (lock NOT released on success — worker owns it)

WpPublishProcessor.handlePublish()
  │
  ├─ [processing: 10% → 90%]
  │
  ├─ DB transaction: update article.status + create ExportHistory
  │      └─ on DB failure: write ExportHistory(PARTIAL), throw WpPartialError
  │           (outer catch skips writing FAILED record for WpPartialError)
  │
  └─ finally { redis.releaseLock(key, lockToken) }
           → Lua: if GET(key) == lockToken then DEL(key)
           (Lua guard prevents ghost release if TTL already expired)
```

---

## SSE Streaming Architecture

```
Client                    API Server                        Redis
  │                           │                               │
  ├──POST /jobs/sse-ticket────►│                               │
  │                           ├──SET sse:ticket:<uuid>────────►│
  │◄────{ ticket: <uuid> }────┤   userId, EX 30               │
  │                           │                               │
  ├──EventSource /jobs/stream │                               │
  │   /:articleId?ticket=uuid►│                               │
  │                           ├──GETDEL sse:ticket:<uuid>────►│
  │                           │◄─userId (or nil → 401)────────┤
  │                           │                               │
  │                           │  SseService.getStream()       │
  │                           │  key = userId:articleId       │
  │                           │  Subject<SSEEvent> created    │
  │                           │                               │
  │◄──data: PROGRESS(10%)─────┤◄─emitProgress(articleId, ...)─│ (from worker)
  │◄──data: PROGRESS(50%)─────┤                               │
  │◄──data: COMPLETED(100%)───┤  subject.complete()           │
  │   SSE stream closes       │  stream + createdAt deleted   │
```

Stream TTL: 10 minutes. Stale streams cleaned up every 60 s by `setInterval`.

---

## CI/CD Pipeline (GitHub Actions)

```
git push master / main
        │
        ▼
┌───────────────────────────────────────────────────┐
│  Job 1: CI  (all pushes + PRs)                    │
│  ─────────────────────────────                    │
│  npm ci                                           │
│  build @seopen/shared                             │
│  typecheck: API + Web                             │
│  lint:      API + Web                             │
└───────────────┬───────────────────────────────────┘
                │ (only push to master/main)
                ▼
┌───────────────────────────────────────────────────┐
│  Job 2: Build & Push  (matrix: api, web)          │
│  ─────────────────────────────────────────        │
│  docker/build-push-action                         │
│  tags: sha-<short>, latest                        │
│  push to ghcr.io/<owner>/seopen-api|web           │
│  GHA layer cache (scope per app)                  │
│  NEXT_PUBLIC_* baked in as build-args             │
└───────────────┬───────────────────────────────────┘
                │ needs: build
                ▼
┌───────────────────────────────────────────────────┐
│  Job 3: Deploy to VPS  (environment: production)  │
│  ─────────────────────────────────────────────    │
│  appleboy/ssh-action → VPS                        │
│  1. docker login ghcr.io (GHCR_PAT)               │
│  2. docker compose pull api web  (new images)     │
│  3. docker compose up -d --remove-orphans         │
│     (entrypoint runs prisma migrate deploy)       │
│  4. health check loop: GET /health  (max 60s)     │
│  5. docker image prune -f                         │
└───────────────────────────────────────────────────┘
```

### Required GitHub Secrets
| Secret | Description |
|--------|-------------|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH user (e.g. `ubuntu`) |
| `SSH_PRIVATE_KEY` | Private key matching VPS authorized_keys |
| `SSH_PORT` | SSH port (default 22) |
| `DEPLOY_PATH` | Absolute path on VPS (e.g. `/opt/seopen`) |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope |

### Required GitHub Variables
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Public API URL baked into Next.js bundle |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog key (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for web (optional) |

Concurrency: `cancel-in-progress: true` — duplicate runs for the same ref are cancelled.

# Codebase Summary

## Monorepo Structure

```
web-seo/                          # root (Turborepo + npm workspaces)
├── apps/
│   ├── api/                      # NestJS 10 backend  (port 4000)
│   │   ├── prisma/
│   │   │   └── schema.prisma     # PostgreSQL schema
│   │   └── src/
│   │       ├── main.ts           # Bootstrap, helmet, cors, swagger
│   │       ├── app.module.ts     # Root module
│   │       ├── ai/               # Anthropic wrapper
│   │       ├── articles/         # Core article pipeline + processors
│   │       ├── auth/             # JWT + Google OAuth
│   │       ├── common/           # Guards, filters, interceptors, utils
│   │       ├── jobs/             # SSE streaming, job status
│   │       ├── keywords/         # SERP analysis + processor
│   │       ├── prisma/           # PrismaService
│   │       ├── projects/         # Project CRUD
│   │       ├── redis/            # RedisService (ioredis)
│   │       ├── seo/              # SEO checklist engine
│   │       ├── users/            # User profile, credits, API keys
│   │       └── wordpress/        # WP site CRUD + publish processor
│   └── web/                      # Next.js 14 App Router (port 3000)
│       └── src/
│           ├── app/              # Route segments
│           ├── components/       # UI components
│           └── lib/              # API client, auth context, providers
└── packages/
    └── shared/                   # @seopen/shared — shared between api & web
        └── src/
            ├── constants/        # PLAN_LIMITS, CHECKLIST_WEIGHTS, AI_MODELS, REDIS_KEYS, QUEUE_NAMES
            ├── types/            # Enums (ArticleState, PlanType, ChecklistType, JobStatus, AIEditorAction)
            ├── seo-weights/      # SEO_WEIGHTS record + calculateSeoScore()
            └── readability/      # Vietnamese Flesch readability algorithm
```

---

## API — Key Modules

### `auth/`
- `auth.service.ts` — register (bcrypt 12 rounds), login, logout (clear refreshTokenHash), refreshToken (bcrypt compare), generateTokens (JWT 15m access / 7d refresh)
- `auth.controller.ts` — sets both tokens as **HttpOnly cookies**; Google OAuth callback redirects to `/auth/callback` (no token in URL)
- Strategies: `local`, `jwt`, `refresh`, `google`
- Guards: `LocalAuthGuard`, `JwtAuthGuard`, `GoogleAuthGuard`

### `articles/`
- `articles.service.ts` — full article pipeline: create, CRUD, step1–5, AI action, WP publish lock acquire
- `state-machine.ts` — `TRANSITIONS` map + `assertTransition()`, `canEditContent()`, `canPublish()`
- `processors/outline-generator.processor.ts` — BullMQ worker: load article → Claude Sonnet → parse JSON → save outline → SSE
- `processors/content-writer.processor.ts` — BullMQ worker: per-section content → sanitize → save → SSE
- `internal-link.service.ts` — internal link suggestion logic
- DTOs: `CreateArticleDto`, `UpdateArticleDto`, `Step2Dto` / `Step3Dto`, `AIActionDto`, `PublishWpDto`

### `keywords/`
- `keywords.service.ts` — idempotency-checked job enqueue to `keyword-analysis` queue
- `keyword-analysis.processor.ts` — SERP fetch → Claude AI analysis → save to `Keyword` model + link to article
- `serp.service.ts` — SerpAPI integration (cached in Redis)

### `seo/`
- `seo.service.ts` — `runFullCheck()`: 12 check methods → upsert `SeoChecklist` rows → update `article.seoScore`
- Each check method returns `{ type, passed, score, maxScore, details, suggestions }`

### `wordpress/`
- `wordpress.service.ts` — CRUD for `WpSite` (SSRF-validated URL, encrypted password), test connection
- `wp-publish.processor.ts` — validates ownership + SSRF re-check + SEO score gate + decrypt creds → `axios.post` to WP REST API → DB transaction (PARTIAL on DB failure) → SSE → release lock in `finally`

### `jobs/`
- `jobs.service.ts` — BullMQ job status polling
- `jobs.controller.ts` — `GET /jobs/:queue/:jobId`, `POST /jobs/sse-ticket`, `GET /jobs/stream/:articleId`
- `sse.service.ts` — in-memory `Map<userId:articleId, Subject<SSEEvent>>`; one-time ticket via Redis GETDEL; stale stream cleanup every 60 s

### `users/`
- `users.service.ts` — profile update, change password, save/get API keys (AES-256-GCM encrypt/decrypt)
- `credit.service.ts` — Lua atomic deduct, monthly cron reset (`0 0 1 * *`), Redis cache with async DB sync

### `ai/`
- `anthropic.service.ts` — `complete()` + `completeWithUsage()` wrapper around `@anthropic-ai/sdk`
- `editor-actions.controller.ts` — inline AI actions endpoint

### `common/`
| File | Purpose |
|------|---------|
| `filters/global-exception.filter.ts` | Catch-all: HttpException, Prisma P2002/P2025, unknown → structured JSON + Sentry for 5xx |
| `interceptors/response.interceptor.ts` | Wrap all responses in `{ data, meta }` (skip via `@SkipResponseWrapper()`) |
| `guards/plan.guard.ts` | `@PlanCheck('article'|'project'|'wp_site'|'wp_publish')` — checks limits, deducts credit |
| `guards/rate-limit.guard.ts` | Per-user sliding-window rate limit via Redis Lua |
| `decorators/plan-check.decorator.ts` | Sets `PLAN_CHECK_KEY` metadata consumed by `PlanGuard` |
| `utils/crypto.ts` | AES-256-GCM `encrypt()` / `decrypt()` |
| `utils/ssrf.ts` | `validateWpUrl()` — blocks RFC-1918, loopback, IPv6 private ranges |

---

## Web — Key Pages & Components

### Pages (`apps/web/src/app/`)

| Route | Description |
|-------|-------------|
| `/` | Landing / marketing page |
| `/(auth)/login` | Email/password login form |
| `/(auth)/register` | Registration form |
| `/(dashboard)/dashboard` | Article stats, recent articles |
| `/(dashboard)/projects` | Project list + create |
| `/(dashboard)/projects/[projectId]/articles` | Articles within a project |
| `/(dashboard)/articles/[articleId]` | **Main article editor** (5-step pipeline) |
| `/(dashboard)/wordpress` | WP site management |
| `/(dashboard)/settings` | User profile, API keys, password change |
| `/(dashboard)/pricing` | Plan comparison + upgrade CTA |

### Key Components

| Component | Description |
|-----------|-------------|
| `components/editor/article-editor.tsx` | TipTap rich-text editor with bubble menu; AI action toolbar (rewrite/expand/simplify/humanize) |
| `components/editor/ExportTab.tsx` | HTML export + WP publish trigger with SSE progress tracking |
| `components/editor/InternalLinksPanel.tsx` | Internal link suggestions panel |
| `components/upgrade-modal.tsx` | Shown when plan limit / credit exhausted |
| `components/plan-error-provider.tsx` | Global 403/429 error bus → triggers `UpgradeModal` |
| `components/plan-limits.tsx` | Plan limit usage display |
| `lib/api.ts` | Axios instance with HttpOnly cookie auth, auto-refresh interceptor, plan error bus |
| `lib/auth-context.tsx` | React context for current user |
| `lib/providers.tsx` | QueryClientProvider + PostHog + Sentry |
| `middleware.ts` | Next.js middleware — protect dashboard routes |

---

## Shared Package (`@seopen/shared`)

### Constants (`constants/index.ts`)

| Export | Type | Description |
|--------|------|-------------|
| `PLAN_LIMITS` | `Record<PlanType, PlanLimits>` | Full plan limits table |
| `CHECKLIST_WEIGHTS` | `Record<ChecklistType, number>` | Same as `SEO_WEIGHTS` (legacy alias) |
| `MIN_SEO_SCORE_FOR_PUBLISH` | `60` | Gate for WP publish |
| `AI_MODELS` | `{ SONNET, HAIKU }` | Model name constants |
| `REDIS_KEYS` | functions | Key factory: `RATE_LIMIT`, `AI_QUOTA`, `JOB_IDEMPOTENCY`, `PUBLISH_LOCK`, `SERP_CACHE`, `USER_SESSION` |
| `QUEUE_NAMES` | `{ KEYWORD_ANALYSIS, OUTLINE_GENERATION, CONTENT_WRITING, WORDPRESS_PUBLISH, ONE_CLICK_PUBLISH }` | BullMQ queue names |

### Types (`types/index.ts`)

| Export | Kind | Values |
|--------|------|--------|
| `ArticleState` / `ArticleStatus` | enum | `DRAFT → KEYWORD_ANALYZED → OUTLINED → CONTENT_WRITTEN → SEO_CHECKED → EXPORTED → PUBLISHED` |
| `PlanType` | enum | `STARTER`, `PRO`, `AGENCY` |
| `ChecklistType` | enum | 12 SEO check types |
| `JobStatus` | enum | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `PARTIAL_SUCCESS` |
| `AIEditorAction` | enum | `rewrite`, `expand`, `simplify`, `humanize` |
| `SSEEvent` | type | `{ jobId, type, progress, message, data? }` |
| `ApiResponse<T>` | type | `{ success: true, data: T }` OR `{ success: false, error: { code, message } }` |
| `PlanLimits` | type | Full limit shape |

### Algorithms
- `seo-weights/index.ts` — `SEO_WEIGHTS` record + `calculateSeoScore(passed[], failed[])` utility
- `readability/index.ts` — Vietnamese-adapted Flesch readability score + grade labels

---

## Database Schema (PostgreSQL via Prisma)

### Models Overview

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| `User` | id, email, name, googleId, passwordHash, refreshTokenHash, anthropicKeyEnc, serpApiKeyEnc, plan, articlesUsedMonth | → Project[], Article[], WpSite[], AILog[] |
| `Project` | id, name, domain, language (`vi`), userId | → Article[] |
| `Article` | id, title, targetKeyword, content, contentHtml, outline (Json), seoScore, readabilityScore, wordCount, status, wpPostId, wpPostUrl, creditCharged | → SeoChecklist[], JobLog[], AILog[], ArticleKeyword[], ArticleImage[], InternalLink[], ExportHistory[] |
| `SeoChecklist` | articleId, type (ChecklistType), passed, score, maxScore, details (Json), suggestions[] | unique(articleId, type) |
| `WpSite` | id, name, url, username, passwordEnc (format: `enc:iv:authTag`), userId | → Article[] |
| `Keyword` | keyword (unique), serpData (Json), cachedAt | ↔ Article via ArticleKeyword |
| `ArticleKeyword` | articleId, keywordId, isPrimary | composite PK |
| `AILog` | userId, articleId?, action (AIActionType), model, inputTokens, outputTokens, latencyMs, cost | |
| `ArticleImage` | articleId, url, altText, fileName, width, height, isOptimized | |
| `InternalLink` | sourceArticleId, targetArticleId?, targetUrl, anchorText, linkType, status | |
| `ExportHistory` | articleId, type (HTML\|WORDPRESS), status (SUCCESS\|FAILED\|PENDING\|PARTIAL), wpPostId?, wpPostUrl?, errorMsg? | |
| `JobLog` | articleId, step, status, progress, message, errorMsg | |

### Enums
`UserPlan` · `ArticleStatus` · `ChecklistType` · `AIActionType` · `InternalLinkType` · `ExportType` · `ExportStatus`

---

## Queue Workers (BullMQ via `@nestjs/bull`)

| Queue | Processor | Trigger | Retries | Timeout |
|-------|-----------|---------|---------|---------|
| `keyword-analysis` | `KeywordAnalysisProcessor` | Step 1 endpoint | 3 (exponential) | — |
| `outline-generation` | `OutlineGeneratorProcessor` | Step 2 endpoint | 3 (exponential, 1 s) | 60 s |
| `content-writing` | `ContentWriterProcessor` | Step 3 endpoint | 2 (exponential, 2 s) | 180 s |
| `wordpress-publish` | `WpPublishProcessor` | Step 5b / retry-publish endpoint | 2 (fixed, 5 s) | 120 s |

All workers emit SSE progress events via `SseService.emitProgress()` at each stage (10% → 30% → 50% → 70% → 90% → 100%).

# Code Standards

## TypeScript

- `strict: true` in all tsconfigs (strict null checks, no implicit any)
- `paths` alias: `@seopen/shared` → `packages/shared/src` (dev), built dist (prod)
- Enums defined in `@seopen/shared` and re-exported — never redefine locally
- Prisma-generated types used directly (`ArticleStatus`, `UserPlan`, `ChecklistType`)
- Return types are explicit on service methods; `any` is only used where Prisma `Json` fields require it

---

## NestJS Patterns

### Module Structure
Every feature follows the same layout:
```
feature/
  feature.module.ts     # imports, providers, controllers
  feature.controller.ts # route handlers + swagger decorators
  feature.service.ts    # business logic
  dto/                  # request DTOs (class-validator)
  processors/           # BullMQ @Processor workers (articles, keywords only)
```

### Guards (execution order: global → controller → handler)

| Guard | Scope | Description |
|-------|-------|-------------|
| `JwtAuthGuard` | Global default | Validates `access_token` HttpOnly cookie |
| `PlanGuard` | Handler (via `@PlanCheck`) | Enforces plan limits; deducts article credit atomically |
| `RateLimitGuard` | Handler (via `@RateLimit`) | Sliding-window per-user; uses Redis Lua |
| `ThrottlerGuard` | Global (100 req/60 s) | NestJS built-in IP-based throttle |

### Key Decorators

| Decorator | Purpose |
|-----------|---------|
| `@PlanCheck('article' | 'project' | 'wp_site' | 'wp_publish')` | Attach plan enforcement metadata |
| `@RateLimit(limit, windowSec)` | Attach rate-limit metadata |
| `@SkipResponseWrapper()` | Opt out of `ResponseInterceptor` (used on SSE endpoints) |
| `@GetUser(field?)` | Extract full user or a field from `req.user` |
| `@CurrentUser()` | Alias for `@GetUser()` in common decorators |

### Interceptors
`ResponseInterceptor` wraps every non-skipped response:
```json
{ "data": <payload>, "meta": { "timestamp": "...", "count": N } }
```
Arrays get `meta.count`; redirects (3xx), raw strings, and already-wrapped bodies pass through unchanged.

### Filters
`GlobalExceptionFilter` (`@Catch()` — catches everything):
- `HttpException` → preserves status + structured `error` envelope from guards
- `Prisma.PrismaClientKnownRequestError` → P2002 → 409 Conflict, P2025 → 404 Not Found
- Unknown → 500 + Sentry capture
- Response shape: `{ success: false, statusCode, message, path, timestamp, error? }`

---

## DTO Validation (class-validator)

```typescript
// Example pattern
export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  targetKeyword: string

  @IsOptional()
  @IsUUID()
  projectId?: string
}
```

Global `ValidationPipe` settings:
- `whitelist: true` — strip undeclared properties
- `forbidNonWhitelisted: true` — throw on extra properties
- `transform: true` + `enableImplicitConversion: true` — coerce query params

Status update is **blocked** on the general `PATCH /articles/:id` endpoint; callers must use `PATCH /articles/:id/status` which enforces the state machine.

---

## Error Handling

### Structured Error Response
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Plan limit reached",
  "path": "/api/v1/articles",
  "timestamp": "2026-03-11T00:00:00.000Z",
  "error": {
    "code": "CREDIT_EXHAUSTED",
    "message": "Đã hết lượt tạo bài viết...",
    "upgradeUrl": "/pricing",
    "plan": "STARTER",
    "limit": 30
  }
}
```

### Error Codes (produced by guards/services)

| Code | Status | Source |
|------|--------|--------|
| `CREDIT_EXHAUSTED` | 403 | `CreditService` |
| `PROJECT_LIMIT_REACHED` | 403 | `PlanGuard` |
| `WP_SITE_LIMIT_REACHED` | 403 | `PlanGuard` |
| `WP_PUBLISH_NOT_ALLOWED` | 403 | `PlanGuard` (STARTER plan) |
| `RATE_LIMIT_EXCEEDED` | 429 | `RateLimitGuard` |

### Frontend Error Bus
`lib/api.ts` has a secondary response interceptor: 403/429 responses with a structured `error.code` field fire `_planErrorHandler`. Components subscribe via `onPlanError(handler)` (returns unsubscribe function). The `PlanErrorProvider` renders `UpgradeModal` on receipt.

---

## Security Patterns

### Auth Token Delivery (HttpOnly Cookies)
```
access_token  → httpOnly, sameSite: strict, maxAge: 15min, secure (prod)
refresh_token → httpOnly, sameSite: lax,    maxAge: 7d,    secure (prod)
```
Tokens are **never returned in response body or URL**. Axios client uses `withCredentials: true`; auto-refresh on 401 via queued-retry interceptor.

### TOCTOU Prevention
- Article ownership re-verified in every DB write: `prisma.article.update({ where: { id, userId } })`
- SSE ticket: `GETDEL` atomic — two concurrent requests with the same ticket cannot both succeed
- Credit deduction: Lua `GET + DECRBY` in single round-trip

### SSRF Protection (`utils/ssrf.ts`)
`validateWpUrl(url)` called at both **WP site registration** and **publish time** (mitigates DNS rebinding window).

Blocked ranges:
- IPv4: `127.x`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.x`, `0.x`
- IPv6: `::1`, ULA (`fc00::/7`), link-local (`fe80::/10`), IPv4-mapped private

### AES-256-GCM Encryption (`utils/crypto.ts`)
Used for WordPress `applicationPassword`, Anthropic key, SerpAPI key.
```
encrypt(plaintext) → { encrypted, iv, authTag }
stored as "encrypted:iv:authTag"
decrypt(encrypted, iv, authTag) → plaintext
```
Key derived from `ENCRYPTION_KEY` env var via SHA-256. Each encryption uses a fresh random IV.

### HTML Sanitization (`sanitize-html` allowlist)
Applied in `ArticlesService.buildExportHtml()` and `WpPublishProcessor` before any HTML leaves the system.
- Allowed tags: structural (h1–h6, p, blockquote, pre, code), lists, inline formatting, a, img, tables, div/span/figure
- Allowed attrs: `href/title/target/rel` on `<a>`, `src/alt/title/width/height` on `<img>`, `class/id` on `*`
- Allowed schemes: `http`, `https`, `mailto` (img also allows `data:`)
- Transform: all `<a>` tags get `rel="noopener noreferrer"` injected

---

## Redis Patterns

### Distributed Lock (WP publish)
```
Service:   lockToken = acquireLock(key, 150s)   → SET key token EX 150 NX
           pass lockToken in BullMQ job data
Worker:    finally { releaseLock(key, lockToken) }
           → Lua: if GET(key) == token then DEL(key)
```
The Lua check prevents ghost release when TTL expired and another holder acquired the lock.

### Atomic Credit Deduction (Lua)
```lua
local credits = GET(key) or dbCreditsRemaining
if credits <= 0 then return -1 end
DECRBY(key, 1)
return credits - 1
```
DB sync is async (`prisma.user.update` with `catch` logger — non-blocking).

### Sliding-Window Rate Limit (Lua)
```lua
ZREMRANGEBYSCORE key -inf windowStart
ZADD key now now
EXPIRE key windowSeconds
return ZCARD(key) <= limit ? 1 : 0
```

### One-Time SSE Ticket
```
POST /jobs/sse-ticket → redis.SET sse:ticket:<uuid> userId EX 30
GET  /jobs/stream/:articleId?ticket=<uuid> → redis.GETDEL sse:ticket:<uuid>
```
`GETDEL` is atomic (Redis ≥ 6.2); expired or replayed tickets return 401.

### Key Naming Convention
```
rate_limit:<userId>
ai_quota:<userId>:<YYYY-MM-DD>
job:idempotency:<articleId>:<step>
publish:lock:<articleId>
serp:cache:<keyword>
session:<userId>
credits:<userId>
sse:ticket:<uuid>
```

---

## Frontend Patterns

### Data Fetching (React Query)
- All API calls go through typed functions in `lib/api.ts` (axios instance with cookie auth)
- Query keys are string arrays: `['articles', articleId]`, `['projects']`, etc.
- Mutations invalidate related queries on success

### State Management (Zustand)
- Editor state (step progress, current article, SSE status) managed in Zustand stores
- Auth state in `lib/auth-context.tsx` (React context + `useReducer`)

### TipTap Editor (`components/editor/article-editor.tsx`)
Extensions used: `StarterKit`, `Link`, `Image`, `Underline`, `Placeholder`, `CharacterCount`

Bubble menu provides inline AI actions (rewrite/expand/simplify/humanize) — calls `POST /articles/:id/ai-action`, rate-limited to 10/min.

### SSE Progress Tracking
```typescript
// lib/api.ts
jobsApi.createEventSource = async (articleId) => {
  const { ticket } = await api.post('/jobs/sse-ticket')
  return new EventSource(`${API_BASE}/api/v1/jobs/stream/${articleId}?ticket=${ticket}`)
}
```
Frontend listens for `PROGRESS` / `COMPLETED` / `FAILED` events to update UI.

### UI Component Library
Shadcn/ui components (Radix primitives + Tailwind): `Button`, `Card`, `Dialog`, `Tabs`, `Select`, `Badge`, `Progress`, `Avatar`, `DropdownMenu`, `Tooltip`, `Input`, `Textarea`, `Label`

### Analytics (PostHog)
Tracked events: `article_created`, `step_completed` (steps 1–5), `export_html`, `article_published`, `wp_site_added`, `ai_action`, `article_retry_publish`

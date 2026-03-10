# Approved Tech Stack
> Vietnamese SEO/AEO SaaS Platform | Approved: 2026-03-08

## Overview
Single source of truth for all technology choices. Changes require updating
this file and adding a note to the master plan changelog.

---

## Monorepo

| Tool | Version | Role |
|---|---|---|
| pnpm | 9.x | Package manager (workspaces) |
| Turborepo | 2.x | Build orchestration + caching |
| TypeScript | 5.x | Language (strict mode across all packages) |

```
D:/WEB-SEO/
  apps/web          Next.js 14 App Router
  apps/api          NestJS 10
  packages/shared   Shared types, DTOs, constants, readability
```

---

## Frontend (apps/web)

| Tool | Version | Role |
|---|---|---|
| Next.js | 14.x (App Router) | React framework + SSR/SSG |
| React | 18.x | UI library |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | Pre-built accessible UI components |
| TipTap | 2.x | ProseMirror rich text editor |
| NextAuth.js | v5 (beta) | Auth (Google + Email magic link) |
| PostHog | latest | Product analytics + feature flags |
| DOMPurify | 3.x | XSS sanitization for AI HTML output |
| dnd-kit | latest | Drag-and-drop for outline editor |

### Notes
- App Router only (no Pages Router)
- `auth()` helper from NextAuth v5 in Server Components
- `middleware.ts` at root protects `/(dashboard)` routes
- CSP header via `next.config.js` headers()

---

## Backend (apps/api)

| Tool | Version | Role |
|---|---|---|
| NestJS | 10.x | Node.js framework (modular, DI) |
| Prisma | 5.x | ORM + migrations + type-safe client |
| @nestjs/jwt | latest | JWT access token management |
| @nestjs/passport | latest | Strategy-based auth |
| @nestjs/bullmq | latest | BullMQ queue integration |
| @nestjs/schedule | latest | Cron jobs (monthly credit reset) |
| @nestjs/config | latest | ConfigService + env validation |
| class-validator | latest | DTO validation decorators |
| class-transformer | latest | DTO serialisation |
| cheerio | 1.x | Server-side HTML parsing for SEO checks |
| bcrypt | 5.x | Refresh token hashing (rounds=10) |
| pino | 8.x | Structured JSON logging |
| sanitize-html | 2.x | Sanitize AI HTML before DB storage |
| ioredis | 5.x | Redis client (pub/sub + cache) |

---

## AI & External APIs

| Service | SDK | Used For |
|---|---|---|
| Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) | @anthropic-ai/sdk | Steps 1, 2, 3 (async, BullMQ) |
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | @anthropic-ai/sdk | Editor actions, SEO hints (sync, < 8s) |
| SerpAPI | REST fetch | SERP reverse-engineering (Step 1) |

```typescript
// packages/shared/src/constants.ts
export const AI_MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku:  'claude-haiku-4-5-20251001',
} as const;
```
---

## Database & Cache

| Service | Version | Role |
|---|---|---|
| PostgreSQL | 16 | Primary relational database |
| Redis | 7 | Cache, BullMQ, pub/sub, rate limiting, locks |

### Redis Key Prefix Map
```
bull:*          BullMQ job queues
article:*       SSE pub/sub progress channels
serp:*          SerpAPI response cache (TTL 24h)
rl:*            Rate limit sorted sets (sliding window)
credits:*       Article credit cache (TTL 1h)
wp-publish:*    Publish idempotency locks (TTL 120s NX)
```

### PostgreSQL Notes
- PgBouncer connection pooling in production
- `@db.Text` for Article.content + Article.outline
- `onDelete: Cascade` on all FK relations
- Key indexes: Article(projectId, state), ChecklistItem(articleId, key)

---

## Queue & Async

| Tool | Version | Role |
|---|---|---|
| BullMQ | 5.x | Job queues for async AI operations |

### Queue Names
```
serp-jobs   SerpAnalysisProcessor         (Step 1)
ai-jobs     OutlineGeneratorProcessor     (Step 2)
            ContentWriterProcessor        (Step 3)
            WordPressPublishProcessor     (Step 5)
```

### Default Job Options
```typescript
{ attempts: 3, backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100, removeOnFail: 200 }
```

---

## Auth

| Tool | Role |
|---|---|
| NextAuth.js v5 | Frontend session (Google + Email) |
| passport-jwt | Backend JWT strategy |
| bcrypt | Refresh token hash (rounds=10) |

```
Access token:  15 min  | HS256 | Authorization: Bearer header
Refresh token: 7 days  | HS256 | HttpOnly + Secure + SameSite=Lax cookie
Rotation:      New refresh token issued on every /auth/refresh call
```

---

## Realtime

| Tool | Role |
|---|---|
| SSE (Server-Sent Events) | One-way push from API to client |
| ioredis pub/sub | Bridge between BullMQ workers and SSE |
| EventSource (browser native) | SSE client in Next.js |

### SSE Event Schema
```typescript
interface SSEProgressEvent {
  type:     'STARTED' | 'PROGRESS' | 'PARTIAL_CONTENT' | 'COMPLETED' | 'FAILED';
  step:     1 | 2 | 3 | 4 | 5;
  progress: number;    // 0-100
  message:  string;
  data?:    unknown;   // step-specific payload
  error?:   string;
}
```

---

## Security

| Concern | Solution |
|---|---|
| WP App Password storage | AES-256-GCM (key in env/secrets manager) |
| Refresh tokens | bcrypt hash in DB (never stored plain) |
| XSS from AI output | DOMPurify (client) + sanitize-html (server) |
| CSRF | SameSite=Lax cookie + CORS origin allowlist |
| SQL injection | Prisma parameterised queries (no raw SQL) |
| Rate limiting | Redis sliding window (userId primary, IP fallback) |
| Input validation | class-validator on all NestJS DTOs |
| Content Security | CSP: default-src 'self'; script-src 'self' |
| SSRF (WP URLs) | Validate siteUrl format before HTTP call |

---

## Observability

| Tool | Role |
|---|---|
| Pino | Structured JSON logging (request ID + userId on every log) |
| PostHog | Product analytics, feature flags, A/B tests |
| Sentry (optional) | 5xx error tracking + stack traces |
| Bull Board (dev) | BullMQ visual dashboard (localhost only) |

---

## Deployment

| Tool | Role |
|---|---|
| Docker | Container runtime |
| Docker Compose | Local dev orchestration |
| Dokploy | Production deploy + Traefik reverse proxy |
| GitHub Actions | CI: lint + test + build; CD: push to Dokploy |

### Production Container Images
```
postgres:16-alpine   Primary DB
redis:7-alpine       Cache + queue (AOF persistence enabled)
node:20-alpine       API (NestJS) + Web (Next.js standalone)
```

### Environment Variables (.env.example)
```bash
# Shared secrets (same in api and web)
NEXTAUTH_SECRET=<32+ random chars>

# apps/api/.env
DATABASE_URL=postgresql://webseo:pass@postgres:5432/webseo
REDIS_URL=redis://redis:6379
ANTHROPIC_API_KEY=sk-ant-api03-...
SERPAPI_KEY=<key>
ENCRYPTION_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>

# apps/web/.env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

---

## Versioning Policy
- Pin exact versions in production (`"@nestjs/core": "10.3.2"`)
- NextAuth v5 beta: pin to tested beta release until GA
- Claude model IDs hardcoded in `AI_MODELS` constant (not env var)
- Prisma: run `pnpm prisma generate` after any schema change
- Node.js: 20 LTS (current) across all containers

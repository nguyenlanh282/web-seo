# SEOPen

> AI-powered SEO/AEO content writing platform for the Vietnamese market.

Write SEO-optimised Vietnamese blog posts in 5 guided steps — keyword analysis → outline → content → SEO check → publish — powered by Anthropic Claude.

[![CI/CD](https://github.com/nguyenlanh282/web-seo/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/nguyenlanh282/web-seo/actions/workflows/ci-cd.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?logo=nestjs)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS, TipTap editor, React Query, Zustand |
| Backend | NestJS 10, Prisma ORM, Passport.js, BullMQ |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 (ioredis + BullMQ) |
| AI | Anthropic Claude (Haiku + Sonnet) |
| Monorepo | Turborepo + npm workspaces |
| Monitoring | Sentry (API + Web), PostHog analytics |
| CI/CD | GitHub Actions → GHCR → SSH deploy (VPS) |

---

## Quick Start (local dev)

### Prerequisites
- Node.js ≥ 20
- Docker & Docker Compose
- npm ≥ 10

### 1 — Clone & install

```bash
git clone https://github.com/nguyenlanh282/web-seo.git
cd web-seo
cp .env.example .env
# Fill in required values (see Environment Variables below)
npm install
```

### 2 — Start infrastructure

```bash
docker-compose -f docker-compose.dev.yml up -d
# PostgreSQL :5432, Redis :6379
# Optional pgAdmin: docker-compose -f docker-compose.dev.yml --profile tools up -d
```

### 3 — Migrate database

```bash
npm run db:migrate
# runs prisma migrate dev inside apps/api
```

### 4 — Start dev servers

```bash
npm run dev
# Turborepo starts all apps in parallel
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger (dev only) | http://localhost:4000/api/docs |
| Health check | http://localhost:4000/health |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | ✓ | PostgreSQL password |
| `REDIS_PASSWORD` | ✓ | Redis password |
| `JWT_SECRET` | ✓ | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✓ | Refresh token signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | ✓ | AES-256-GCM key for WP passwords + API keys |
| `ANTHROPIC_API_KEY` | ✓ | Anthropic Claude API key |
| `SERP_API_KEY` | ✓ | SerpAPI key for keyword analysis |
| `GOOGLE_CLIENT_ID` | ✗ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✗ | Google OAuth client secret |
| `CORS_ORIGINS` | ✓ prod | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL` | ✓ | Public API base URL (baked into Next.js bundle) |
| `SENTRY_DSN` | ✗ | Sentry DSN for API error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | ✗ | Sentry DSN for Web |
| `NEXT_PUBLIC_POSTHOG_KEY` | ✗ | PostHog project API key |

Generate secrets:
```bash
openssl rand -base64 64   # JWT_SECRET / JWT_REFRESH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
```

---

## Project Structure

```
apps/
  api/          NestJS backend              (port 4000)
  web/          Next.js 14 App Router       (port 3000)
packages/
  shared/       @seopen/shared — types, constants, algorithms
```

---

## Plans

| Feature | STARTER | PRO | AGENCY |
|---------|---------|-----|--------|
| Articles / month | 30 | 100 | 500 |
| Projects | 2 | 10 | Unlimited |
| WP sites | 0 | 1 | 50 |
| Content Gap analysis | — | ✓ | ✓ |
| Full AI actions | — | ✓ | ✓ |
| WordPress export | HTML only | Single site | Unlimited |
| Internal links | Manual | Suggested | Auto |

Minimum SEO score to publish to WordPress: **60 / 100**

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register (sets HttpOnly cookies) |
| `POST` | `/auth/login` | Login |
| `GET` | `/auth/me` | Current user |
| `GET` | `/auth/google` | Google OAuth initiate |
| `POST` | `/auth/refresh` | Rotate access token from cookie |
| `POST` | `/auth/logout` | Clear session |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create project |
| `GET` | `/articles` | List articles |
| `POST` | `/articles` | Create article |
| `POST` | `/articles/:id/step1/analyze` | Step 1 — keyword analysis (queued) |
| `POST` | `/articles/:id/step2` | Step 2 — outline generation (queued) |
| `POST` | `/articles/:id/step3` | Step 3 — content writing (queued) |
| `POST` | `/articles/:id/step4` | Step 4 — SEO check (sync) |
| `POST` | `/articles/:id/step5/export` | Step 5a — HTML export |
| `POST` | `/articles/:id/publish-wp` | Step 5b — WordPress publish (queued) |
| `POST` | `/articles/:id/ai-action` | Inline AI editor action (sync) |
| `POST` | `/jobs/sse-ticket` | Issue one-time SSE ticket |
| `GET` | `/jobs/stream/:articleId` | SSE progress stream |
| `GET` | `/wordpress/sites` | List WP sites |
| `POST` | `/wordpress/sites` | Add WP site |
| `DELETE` | `/wordpress/sites/:id` | Remove WP site |

All endpoints prefixed with `/api/v1`.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) | Product requirements: features, plans, SEO scoring, integrations, NFRs |
| [`docs/codebase-summary.md`](docs/codebase-summary.md) | Monorepo structure, modules, DB schema, queue workers |
| [`docs/code-standards.md`](docs/code-standards.md) | TypeScript/NestJS patterns, security, Redis, frontend conventions |
| [`docs/system-architecture.md`](docs/system-architecture.md) | Architecture diagrams, auth flow, state machine, CI/CD |
| [`docs/deployment.md`](docs/deployment.md) | Production deployment guide |
| [`docs/docker-guide.md`](docs/docker-guide.md) | Docker Compose usage |
| [`docs/tech-stack.md`](docs/tech-stack.md) | Technology decisions |

---

## License

Private — SEOPen SaaS Platform

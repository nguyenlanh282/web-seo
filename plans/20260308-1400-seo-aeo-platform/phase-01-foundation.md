# Phase 01 - Foundation
> Weeks 1-2 | Priority: P0 | Status: Pending

## Context Links
- Master plan: [plan.md](./plan.md)
- Next phase: [phase-02-ai-engine-step1.md](./phase-02-ai-engine-step1.md)
- Tech stack: [D:/WEB-SEO/docs/tech-stack.md](../../docs/tech-stack.md)

---

## Overview
Stand up the monorepo skeleton so every later phase builds on a solid tested
base. Deliverables: Turborepo workspace, NestJS + Prisma + PostgreSQL 16,
Next.js 14 App Router with NextAuth v5, article state machine, full CRUD for
Projects/Articles, and Docker Compose for local dev.

---

## Key Insights
- Turborepo pipeline caches artefacts; set `outputs` per app.
- NextAuth v5 uses `auth()` helper - NOT `getServerSession()`.
- Prisma migrations run via `prisma migrate deploy` in Docker entrypoint.
- State transitions enforced in ArticlesService - never raw DB writes.
- HttpOnly + SameSite=Lax cookies for the refresh token.

---

## Requirements
- [ ] Turborepo monorepo: apps/web, apps/api, packages/shared
- [ ] PostgreSQL 16 + Redis 7 via Docker Compose
- [ ] Prisma schema: 11 models (User, Project, Article, ArticleKeyword,
      ChecklistItem, InternalLink, ArticleImage, WordPressConnection,
      ExportHistory, AILog, Keyword)
- [ ] NestJS modules: Auth, Users, Projects, Articles, Prisma
- [ ] NextAuth v5: Google OAuth + Email magic link
- [ ] JWT 15 min access + 7 day refresh token (HttpOnly cookie, rotation)
- [ ] Article CRUD guarded by state machine
- [ ] Projects CRUD (plan-limit guard placeholder for Phase 6)
- [ ] packages/shared: DTOs, enums, ArticleState, constants
- [ ] .env.example for api and web

---

## Architecture

### Monorepo Directory Tree
```
D:/WEB-SEO/
+-- apps/
|   +-- web/                    # Next.js 14 App Router
|   |   +-- app/
|   |   |   +-- (auth)/        # login, register pages
|   |   |   +-- (dashboard)/   # /dashboard, /projects, /articles
|   |   |   +-- api/auth/      # NextAuth route handler
|   |   +-- components/
|   |   |   +-- ui/            # shadcn/ui components
|   |   |   +-- layout/        # Sidebar, Header
|   |   +-- lib/
|   |       +-- api.ts         # fetch wrapper with auth headers
|   |       +-- auth.ts        # NextAuth v5 config
|   +-- api/                    # NestJS
|       +-- src/
|       |   +-- auth/          # JwtStrategy, RefreshStrategy
|       |   +-- users/
|       |   +-- projects/
|       |   +-- articles/      # ArticlesModule + state machine
|       |   +-- common/        # Guards, Filters, Decorators
|       |   +-- prisma/        # PrismaModule, PrismaService
|       +-- prisma/
|           +-- schema.prisma
|           +-- migrations/
+-- packages/
|   +-- shared/
|       +-- src/
|           +-- types/         # ArticleState enum, Plan enum
|           +-- dtos/          # class-validator DTOs
|           +-- constants.ts   # SEO_WEIGHTS, AI_MODELS, PLAN_LIMITS
|           +-- readability.ts # Vietnamese Flesch formula
+-- docker-compose.yml
+-- turbo.json
+-- package.json
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  { "outputs": [] },
    "test":  { "outputs": [] }
  }
}
```

### docker-compose.yml (dev)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: webseo, POSTGRES_PASSWORD: secret }
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    env_file: ./apps/api/.env
    ports: ["3001:3001"]
  web:
    build: ./apps/web
    depends_on: [api]
    env_file: ./apps/web/.env
    ports: ["3000:3000"]
volumes:
  postgres_data:
```

### Prisma Schema - Core Models
```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  plan             Plan      @default(STARTER)
  articleCredits   Int       @default(30)
  refreshTokenHash String?
  createdAt        DateTime  @default(now())
  projects         Project[]
  aiLogs           AILog[]
}

model Project {
  id           String               @id @default(cuid())
  userId       String
  name         String
  domain       String?
  createdAt    DateTime             @default(now())
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles     Article[]
  wpConnection WordPressConnection?
}

model Article {
  id        String         @id @default(cuid())
  projectId String
  title     String
  state     ArticleState   @default(DRAFT)
  content   String?        @db.Text
  metaDesc  String?
  seoScore  Int?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  project   Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  keywords  ArticleKeyword[]
  checklist ChecklistItem[]
  images    ArticleImage[]
  exports   ExportHistory[]
}

model WordPressConnection {
  id              String   @id @default(cuid())
  projectId       String   @unique
  siteUrl         String
  username        String
  encryptedPass   String   // AES-256-GCM encrypted
  iv              String
  authTag         String
  project         Project  @relation(fields: [projectId], references: [id])
}

enum ArticleState {
  DRAFT KEYWORD_ANALYZED OUTLINED CONTENT_WRITTEN SEO_CHECKED EXPORTED PUBLISHED
}

enum Plan { STARTER PRO AGENCY }
```

### State Machine (apps/api/src/articles/state-machine.ts)
```typescript
import { ArticleState } from '@web-seo/shared';
import { BadRequestException } from '@nestjs/common';

export const TRANSITIONS: Record<ArticleState, ArticleState[]> = {
  [ArticleState.DRAFT]:            [ArticleState.KEYWORD_ANALYZED],
  [ArticleState.KEYWORD_ANALYZED]: [ArticleState.DRAFT, ArticleState.OUTLINED],
  [ArticleState.OUTLINED]:         [ArticleState.KEYWORD_ANALYZED, ArticleState.CONTENT_WRITTEN],
  [ArticleState.CONTENT_WRITTEN]:  [ArticleState.OUTLINED, ArticleState.SEO_CHECKED],
  [ArticleState.SEO_CHECKED]:      [ArticleState.CONTENT_WRITTEN, ArticleState.EXPORTED],
  [ArticleState.EXPORTED]:         [ArticleState.SEO_CHECKED, ArticleState.PUBLISHED],
  [ArticleState.PUBLISHED]:        [ArticleState.EXPORTED],
};

export function assertTransition(from: ArticleState, to: ArticleState): void {
  if (!TRANSITIONS[from]?.includes(to))
    throw new BadRequestException(`Cannot transition from ${from} to ${to}`);
}
```

### packages/shared/src/constants.ts
```typescript
export const AI_MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',  // Steps 1, 2, 3
  haiku:  'claude-haiku-4-5-20251001',   // SEO suggestions, editor actions
} as const;

export const PLAN_LIMITS = {
  STARTER: { articles: 30,  projects: 2 },
  PRO:     { articles: 100, projects: 10 },
  AGENCY:  { articles: 500, projects: Infinity },
} as const;

export const SEO_WEIGHTS = {
  HEADLINE_KEYWORD:       12,
  META_DESCRIPTION:       10,
  HEADING_STRUCTURE:      12,
  IMAGE_ALT:               6,
  IMAGE_FILENAME:          4,
  KEYWORD_COVERAGE:       15,
  TAGS:                    4,
  INTERNAL_EXTERNAL_LINKS:12,
  ANCHOR_TEXT:             5,
  CONTENT_LENGTH:          5,
  READABILITY:            10,
  CONTENT_GAP_COVERAGE:    5,
} as const; // total = 100
```

---

## Related Code Files
- `apps/api/src/articles/articles.service.ts` - state machine + CRUD
- `apps/api/src/auth/strategies/jwt.strategy.ts` - access token validation
- `apps/api/src/auth/strategies/refresh.strategy.ts` - refresh rotation
- `apps/api/prisma/schema.prisma` - source of truth for DB
- `apps/web/lib/auth.ts` - NextAuth v5 config
- `packages/shared/src/types/article-state.enum.ts`
- `packages/shared/src/constants.ts`

---

## Implementation Steps

### Step 1 - Scaffold Monorepo (Day 1)
1. `pnpm init` at D:/WEB-SEO/, add workspaces: ["apps/*", "packages/*"].
2. `pnpm add -Dw turbo` and create turbo.json.
3. `pnpm create next-app apps/web --typescript --tailwind --app`.
4. `npx @nestjs/cli new apps/api --package-manager pnpm`.
5. `mkdir packages/shared` + init + configure tsup for dual CJS/ESM build.
6. Add `@web-seo/shared` to dependencies in both apps.

### Step 2 - Docker Compose (Day 1)
- Write docker-compose.yml (postgres:16-alpine, redis:7-alpine, api, web).
- Write apps/api/Dockerfile: node:20-alpine, prisma migrate deploy, start.
- Write apps/web/Dockerfile: node:20-alpine, next build, start.

### Step 3 - Prisma Setup (Day 2)
1. `pnpm add prisma @prisma/client` in apps/api.
2. `npx prisma init` - set DATABASE_URL in .env.
3. Write full schema with all 11 models + enums.
4. `npx prisma migrate dev --name init`.
5. PrismaModule (global) wrapping PrismaService extends PrismaClient.

### Step 4 - NestJS Auth (Day 2-3)
1. Install: @nestjs/jwt @nestjs/passport passport-jwt bcrypt @nestjs/config
   class-validator class-transformer.
2. JwtStrategy: reads Authorization Bearer header, validates 15 min exp.
3. RefreshStrategy: reads refresh_token HttpOnly cookie, validates 7 day exp.
4. On refresh: hash compare -> rotate token -> set new cookie -> return access.
5. AuthController: POST /auth/login, /auth/refresh, /auth/logout, /auth/google.

### Step 5 - Projects & Articles CRUD (Day 3-4)
1. ProjectsController: CRUD at /projects, ownership guard on all operations.
2. ArticlesController: CRUD at /projects/:projectId/articles.
3. ArticlesService.transition(id, toState) calls assertTransition() first.
4. All endpoints: @UseGuards(JwtAuthGuard) + @GetUser() decorator.
5. GlobalExceptionFilter maps Prisma P2002/P2025 -> 409/404 HTTP errors.

### Step 6 - Next.js Auth + Dashboard Shell (Day 4-5)
1. Install next-auth@beta; create app/api/auth/[...nextauth]/route.ts.
2. Configure Google + Email providers; middleware.ts protects /(dashboard).
3. Dashboard layout: collapsible Sidebar, sticky Header with user avatar.
4. lib/api.ts: typed fetch wrapper injecting Authorization from session.
5. Projects list + create modal; Articles list per project.

### Step 7 - Shared Package (Day 5)
1. Export ArticleState, Plan enums.
2. Export PLAN_LIMITS, SEO_WEIGHTS, AI_MODELS constants.
3. Export all DTOs: CreateArticleDto, UpdateArticleDto, CreateProjectDto.
4. tsup config: entry src/index.ts, formats [cjs, esm], dts true.

---

## Todo List

### Monorepo & Infra
- [ ] pnpm workspace + Turborepo init
- [ ] turbo.json pipeline (build, dev, lint, test)
- [ ] Docker Compose (postgres:16, redis:7, api, web)
- [ ] .env.example for api and web
- [ ] packages/shared tsup build config

### Database
- [ ] Full Prisma schema (11 models)
- [ ] Initial migration: `prisma migrate dev --name init`
- [ ] Dev seed script (1 user, 1 project, 2 articles in DRAFT)
- [ ] PrismaModule (global) + PrismaService
- [ ] Docker entrypoint.sh: migrate deploy before server start

### Backend - Auth
- [ ] JwtStrategy (access token, 15 min expiry)
- [ ] RefreshStrategy (cookie, 7 day, rotation on each use)
- [ ] AuthController (login / refresh / logout / google)
- [ ] @GetUser() parameter decorator
- [ ] JwtAuthGuard (@UseGuards)
- [ ] Refresh token bcrypt-hashed in User.refreshTokenHash

### Backend - CRUD
- [ ] ProjectsModule (CRUD + userId ownership check)
- [ ] ArticlesModule (CRUD + state machine enforcement)
- [ ] assertTransition() + TRANSITIONS constant
- [ ] GlobalExceptionFilter (Prisma errors to HTTP)
- [ ] ResponseInterceptor ({ data, meta } wrapper)

### Frontend
- [ ] Next.js 14 App Router + Tailwind + shadcn/ui install
- [ ] NextAuth v5 config (Google + Email)
- [ ] middleware.ts protecting /(dashboard) routes
- [ ] Dashboard layout (Sidebar + Header + main)
- [ ] Projects list page + Create project modal
- [ ] Articles list page per project
- [ ] lib/api.ts typed fetch wrapper

### Shared Package
- [ ] ArticleState enum + Plan enum
- [ ] PLAN_LIMITS constant
- [ ] SEO_WEIGHTS constant (12 items, total=100)
- [ ] AI_MODELS constant
- [ ] All DTOs with class-validator decorators

---

## Success Criteria
- `pnpm dev` starts all services in < 30s via Turborepo
- POST /auth/login returns access token; refresh cookie is set
- POST /projects requires auth; GET /projects returns only owned projects
- Invalid state transition (DRAFT -> PUBLISHED) returns HTTP 400
- NextAuth session persists after page refresh
- `prisma migrate deploy` runs cleanly in Docker entrypoint

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| NextAuth v5 beta breaking changes | Medium | High | Pin exact beta version, test auth flow first |
| Prisma migration conflicts | Low | Medium | One migration per PR, never edit past migrations |
| Turborepo stale cache | Low | Medium | Set outputs/inputs correctly; --force escape hatch |
| pnpm hoisting conflicts | Low | Low | shamefully-hoist=false, explicit deps per package |

---

## Security Considerations
- Refresh tokens stored as bcrypt hash (rounds=10) in DB
- HttpOnly; Secure; SameSite=Lax on refresh token cookie
- class-validator on all DTOs: @IsString(), @MaxLength(), @IsEmail()
- Ownership guard on all project/article endpoints (userId === resource.userId)
- No raw SQL - Prisma parameterises all queries automatically
- CORS: only allow known frontend origin in production

---

## Next Steps -> Phase 2
- BullMQ queue module (ai-jobs queue, serp-jobs queue)
- SSE endpoint: GET /articles/:id/stream
- SerpAPI service wrapper with caching
- Claude Sonnet integration for Step 1 keyword analysis
- Job progress events: STARTED, PROGRESS(n%), COMPLETED, FAILED

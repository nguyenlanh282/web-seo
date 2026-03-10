# SEOPen - AI-Powered SEO Writing Platform

A SaaS platform for writing SEO-optimized blog content using AI.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TailwindCSS + TipTap editor
- **Backend**: NestJS 10 + Prisma ORM
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7
- **AI**: Anthropic Claude (Haiku + Sonnet)
- **Monorepo**: Turborepo + npm workspaces

## Project Structure

```
apps/
  web/          # Next.js 14 frontend (port 3000)
  api/          # NestJS backend (port 4000)
packages/
  shared/       # Shared types, constants, readability algorithm
```

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

### 1. Clone and install

```bash
cp .env.example .env
# Edit .env with your API keys

npm install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up postgres redis -d
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- Swagger Docs: http://localhost:4000/api/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/register | Register |
| POST | /api/v1/auth/login | Login |
| GET  | /api/v1/auth/me | Current user |
| GET  | /api/v1/projects | List projects |
| POST | /api/v1/projects | Create project |
| GET  | /api/v1/articles | List articles |
| POST | /api/v1/articles | Create article |
| POST | /api/v1/keywords/analyze | SERP analysis |
| POST | /api/v1/seo/check/:id | SEO check |
| POST | /api/v1/ai/rewrite | AI text actions |
| GET  | /api/v1/wordpress/sites | WP sites |
| POST | /api/v1/wordpress/publish/:id | Publish to WP |

## Plans

| Feature | Starter | Pro | Agency |
|---------|---------|-----|--------|
| Articles/month | 30 | 100 | 500 |
| Projects | 2 | 10 | Unlimited |
| WP Sites | 0 | 1 | 50 |
| Content Gap | - | Yes | Yes |
| AI Actions | Basic | Full | Full |

## SEO Score Weights

| Check | Weight |
|-------|--------|
| Keyword Coverage | 15 |
| Headline Keyword | 12 |
| Heading Structure | 12 |
| Internal/External Links | 12 |
| Meta Description | 10 |
| Readability | 10 |
| Image Alt | 6 |
| Anchor Text | 5 |
| Content Length | 5 |
| Content Gap Coverage | 5 |
| Image Filename | 4 |
| Tags | 4 |
| **Total** | **100** |

Minimum score to publish to WordPress: **60**

## License

Private - SEOPen SaaS Platform

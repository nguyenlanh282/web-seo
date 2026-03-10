# Docker Development Guide

## Prerequisites

- Docker Desktop installed
- pnpm installed (optional for local development)

## Quick Start

1. **Copy environment files:**

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

2. **Edit `.env` files** with your credentials:
   - `apps/api/.env`: Add `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, etc.
   - `apps/web/.env`: Keep defaults for local dev

3. **Start all services:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Or with tools (pgAdmin):

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up
```

4. **Access services:**
   - Web app: http://localhost:3000
   - API: http://localhost:4000
   - PostgreSQL: localhost:5432 (user: seopen, pass: seopen_secret)
   - Redis: localhost:6379 (password: redis_secret)
   - pgAdmin: http://localhost:5050 (email: admin@seopen.dev, pass: admin)

## Development Workflow

### Running migrations

```bash
docker-compose --profile migration up migration
```

### Running Prisma Studio

```bash
docker-compose exec api npx prisma studio
```

### Viewing logs

```bash
docker-compose logs -f api
docker-compose logs -f web
```

### Restarting services

```bash
docker-compose restart api
docker-compose restart web
```

## Troubleshooting

### Database connection issues

Make sure PostgreSQL is healthy:

```bash
docker-compose ps
docker-compose logs postgres
```

### Clear data and restart

```bash
docker-compose down -v
docker-compose up
```

### Reset migrations

```bash
docker-compose down -v
rm -rf apps/api/prisma/migrations
docker-compose --profile migration up migration
```

## Production Deployment

For production, use only `docker-compose.yml` without `.dev.yml`:

```bash
docker-compose up -d
```

Make sure to set strong secrets in your `.env` files.

# Vietnamese SEO/AEO SaaS Platform — Master Plan

> **Created**: 2026-03-08 14:00 | **Updated**: 2026-03-10 | **Version**: 1.1

## Project Summary

Full-stack SaaS for Vietnamese SEO/AEO blog writing powered by Claude AI.
Writers go from keyword input to a fully published, SEO-optimised WordPress post
in 5 guided async steps. Target markets: Vietnamese digital-marketing agencies,
content studios, and freelance bloggers.

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js 14 App Router · Tailwind CSS · shadcn/ui · TipTap |
| Backend | NestJS · Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Lock | Redis 7 |
| AI | Anthropic Claude (Sonnet 4.5 + Haiku 4.5) |
| SERP | SerpAPI |
| Auth | NextAuth.js v5 (Google + Email) |
| Queue | BullMQ |
| Realtime | SSE (Server-Sent Events) |
| Deploy | Docker + Dokploy |

## All Phases

| # | Phase | Weeks | Status | File |
|---|---|---|---|---|
| 1 | Foundation — Monorepo, Auth, CRUD, DB, State Machine | 1-2 | ✅ Done | [phase-01-foundation.md](./phase-01-foundation.md) |
| 2 | AI Engine — BullMQ, SSE, SerpAPI, Step 1 Keyword Analysis | 3-4 | ✅ Done | [phase-02-ai-engine-step1.md](./phase-02-ai-engine-step1.md) |
| 3 | Editor — TipTap, Outline + Content Writer (Steps 2 & 3) | 5-6 | ✅ Done | [phase-03-editor-steps-2-3.md](./phase-03-editor-steps-2-3.md) |
| 4 | SEO Checker — 12-Item Checklist + Readability (Step 4) | 7 | ✅ Done | [phase-04-seo-checker.md](./phase-04-seo-checker.md) |
| 5 | Export & WordPress — HTML Export + 1-Click Publish (Step 5) | 8-9 | 🔄 In Progress (~80%) | [phase-05-export-wordpress.md](./phase-05-export-wordpress.md) |
| 6 | Hardening — Publish Pipeline, Plan Enforcement, Rate Limiting | 10 | ⏳ Pending | [phase-06-publish-enforcement.md](./phase-06-publish-enforcement.md) |

## Article State Machine

```
DRAFT → KEYWORD_ANALYZED → OUTLINED → CONTENT_WRITTEN → SEO_CHECKED → EXPORTED → PUBLISHED
```

## SaaS Plans

| Plan | Price | Articles/mo | Projects |
|---|---|---|---|
| Starter | $19 | 30 | 2 |
| Pro | $49 | 100 | 10 |
| Agency | $149 | 500 (fair-use) | Unlimited |

## Timeline Overview

```
Week 1-2  ██████  Phase 1 — Foundation
Week 3-4  ██████  Phase 2 — AI Engine + Step 1
Week 5-6  ██████  Phase 3 — Editor + Steps 2 & 3
Week 7    ███     Phase 4 — SEO Checker
Week 8-9  ██████  Phase 5 — Export & WordPress
Week 10   ███     Phase 6 — Hardening & Launch
```

## Key External Dependencies

- `ANTHROPIC_API_KEY` — Claude Sonnet + Haiku
- `SERPAPI_KEY` — SERP reverse-engineering
- WordPress site URL + Application Password (per-project, AES-256-GCM encrypted)
- `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID / SECRET`
- `DATABASE_URL` (PostgreSQL 16)
- `REDIS_URL` (Redis 7)

## Reference Documents

- PRD v4: `./seo-aeo-prd_4.md` (move to `docs/` recommended)
- Tech Stack: `./docs/tech-stack.md`

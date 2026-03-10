# Phase 06 - Publish Pipeline, Plan Enforcement & Rate Limiting
> Week 10 | Priority: P0 | Status: Pending

## Context Links
- Previous phase: [phase-05-export-wordpress.md](./phase-05-export-wordpress.md)
- Master plan: [plan.md](./plan.md)

---

## Overview
The final hardening phase. Delivers: (1) robust one-click publish pipeline with
partial failure handling, (2) Redis sliding window rate limiting per plan tier,
(3) idempotent article credit deduction, and (4) plan feature gates across all
endpoints. After this phase the product is launch-ready.

---

## Key Insights
- Rate limiting uses a Redis sorted set (sliding window, not fixed bucket).
- Article credit deduction uses a Lua script (atomic decrement + check).
- Plan gates are enforced via a NestJS Guard that reads user.plan + DB counts.
- Partial publish failure (WP post created but DB not updated): Redis lock +
  ExportHistory status = PARTIAL allows safe retry.
- All guards throw structured errors with { code, message, upgradeUrl } body.

---

## Requirements
- [ ] Redis sliding window rate limiter (per user, per endpoint)
- [ ] PlanGuard: checks project count + article credit before creation
- [ ] Idempotent article credit deduction (Lua script)
- [ ] Publish pipeline: partial failure detection + safe retry
- [ ] Plan enforcement on all creation endpoints
- [ ] Error messages with upgrade CTA
- [ ] Frontend: plan limit banners, upgrade modal
- [ ] Frontend: disable buttons when limits reached

---

## Architecture

### Redis Sliding Window Rate Limiter
```typescript
// apps/api/src/common/guards/rate-limit.guard.ts
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { limit, window } = this.reflector.get<RateLimitMeta>(
      'rateLimit', context.getHandler()
    ) ?? { limit: 60, window: 60 };

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.ip;
    const key = `rl:${context.getHandler().name}:${userId}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Sorted set: score = timestamp, member = timestamp:random
    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, '-inf', windowStart);        // remove old
    pipe.zadd(key, now, `${now}:${Math.random()}`);         // add current
    pipe.zcard(key);                                         // count
    pipe.expire(key, window + 1);
    const results = await pipe.exec();
    const count = results[2][1] as number;

    if (count > limit) {
      throw new TooManyRequestsException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Limit: ${limit}/${window}s`,
        retryAfter: window,
      });
    }
    return true;
  }
}

// Usage:
@RateLimit({ limit: 10, window: 60 })
@Post(':id/ai-action')
async aiAction() { ... }
```

### Article Credit Deduction (Atomic Lua Script)
```typescript
// apps/api/src/users/credit.service.ts
@Injectable()
export class CreditService {
  // Lua script: atomically check and decrement
  private readonly LUA_DEDUCT = `
    local credits = tonumber(redis.call('GET', KEYS[1]))
    if credits == nil then credits = tonumber(ARGV[2]) end
    if credits <= 0 then return -1 end
    redis.call('SET', KEYS[1], credits - 1)
    return credits - 1
  `;

  async deductCredit(userId: string, dbCredits: number): Promise<number> {
    const key = `credits:${userId}`;
    // Prime Redis from DB if not cached
    const cached = await this.redis.get(key);
    if (!cached) await this.redis.set(key, dbCredits, 'EX', 3600);

    const remaining = await this.redis.eval(
      this.LUA_DEDUCT, 1, key, '', String(dbCredits)
    ) as number;

    if (remaining < 0) throw new ForbiddenException({
      code: 'CREDIT_EXHAUSTED',
      message: 'Monthly article limit reached. Upgrade to continue.',
      upgradeUrl: '/settings/upgrade',
    });

    // Sync to DB asynchronously (not in critical path)
    this.prisma.user.update({ where: { id: userId },
      data: { articleCredits: remaining } }).catch(console.error);

    return remaining;
  }

  async resetMonthlyCredits(userId: string, plan: Plan): Promise<void> {
    const credits = PLAN_LIMITS[plan].articles;
    await Promise.all([
      this.prisma.user.update({ where: { id: userId }, data: { articleCredits: credits } }),
      this.redis.del(`credits:${userId}`),
    ]);
  }
}
```

### Plan Guard
```typescript
// apps/api/src/common/guards/plan.guard.ts
@Injectable()
export class PlanGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user: User = req.user;
    const checkType = this.reflector.get<'project' | 'article'>(
      'planCheck', context.getHandler()
    );

    if (checkType === 'project') {
      const count = await this.prisma.project.count({ where: { userId: user.id } });
      const limit = PLAN_LIMITS[user.plan].projects;
      if (count >= limit) throw new ForbiddenException({
        code: 'PROJECT_LIMIT_REACHED',
        message: `Your ${user.plan} plan allows ${limit} projects.`,
        upgradeUrl: '/settings/upgrade',
      });
    }

    if (checkType === 'article') {
      await this.creditService.deductCredit(user.id, user.articleCredits);
    }

    return true;
  }
}

// Usage:
@PlanCheck('article')
@UseGuards(JwtAuthGuard, PlanGuard)
@Post()
async createArticle() { ... }
```

### Publish Pipeline - Partial Failure Handling
```typescript
// ExportHistory.status: PENDING -> SUCCESS | FAILED | PARTIAL
@Processor('ai-jobs')
export class WordPressPublishProcessor extends WorkerHost {
  async process(job: Job<WpPublishJobData>): Promise<void> {
    const { articleId } = job.data;
    let wpPostId: number | null = null;

    // Idempotency: skip if already successfully published
    const existing = await this.prisma.exportHistory.findFirst({
      where: { articleId, type: 'WORDPRESS', status: 'SUCCESS' },
    });
    if (existing) {
      await this.emit(articleId, 'COMPLETED', 100, existing.wpPostUrl!);
      return;
    }

    const record = await this.prisma.exportHistory.create({
      data: { articleId, type: 'WORDPRESS', status: 'PENDING' },
    });

    try {
      const wpPost = await this.wpService.publishArticle(articleId);
      wpPostId = wpPost.id;
      await this.prisma.exportHistory.update({
        where: { id: record.id },
        data: { status: 'SUCCESS', wpPostId: String(wpPost.id), wpPostUrl: wpPost.link },
      });
      await this.articlesService.transition(articleId, ArticleState.PUBLISHED);
      await this.emit(articleId, 'COMPLETED', 100, wpPost.link);
    } catch (err) {
      // PARTIAL: WP post was created but DB not updated
      const status = wpPostId ? 'PARTIAL' : 'FAILED';
      await this.prisma.exportHistory.update({
        where: { id: record.id },
        data: { status, errorMessage: err.message,
                wpPostId: wpPostId ? String(wpPostId) : null },
      });
      await this.emit(articleId, 'FAILED', 0, err.message);
      throw err; // BullMQ will retry per job options
    }
  }
}
```

### Rate Limit Presets Per Plan
```typescript
export const RATE_LIMITS = {
  STEP1:      { STARTER: 10, PRO: 30, AGENCY: 100 },  // per hour
  STEP2:      { STARTER: 10, PRO: 30, AGENCY: 100 },
  STEP3:      { STARTER: 5,  PRO: 20, AGENCY: 80  },
  AI_ACTION:  { STARTER: 5,  PRO: 15, AGENCY: 50  },  // per minute
  WP_PUBLISH: { STARTER: 5,  PRO: 20, AGENCY: 100 },  // per hour
} as const;
```

### Monthly Credit Reset (Cron)
```typescript
@Injectable()
export class CreditResetCron {
  @Cron('0 0 1 * *') // 1st of every month, midnight UTC
  async resetAllCredits(): Promise<void> {
    const users = await this.prisma.user.findMany({ select: { id: true, plan: true } });
    await Promise.all(users.map(u =>
      this.creditService.resetMonthlyCredits(u.id, u.plan as Plan)
    ));
    this.logger.log(`Credits reset for ${users.length} users`);
  }
}
```
---

## Implementation Steps

### Step 1 - Rate Limiter (Day 1)
1. RateLimitGuard using Redis sorted set (sliding window algorithm).
2. @RateLimit() decorator storing limit + window in metadata.
3. Apply to: /step1, /step2, /step3, /ai-action, /publish-wp.
4. Integration test: N+1 requests returns 429 with retryAfter.

### Step 2 - Plan Guard & Credits (Day 1-2)
1. PlanGuard reads project/article limits from PLAN_LIMITS.
2. CreditService with Lua atomic decrement + DB sync.
3. @PlanCheck() decorator on createArticle + createProject.
4. Monthly credit reset cron (1st of month, midnight UTC).

### Step 3 - Publish Pipeline Hardening (Day 2-3)
1. ExportHistory PENDING/SUCCESS/FAILED/PARTIAL statuses.
2. Idempotency: check existing SUCCESS record before each publish.
3. POST /articles/:id/retry-publish for PARTIAL/FAILED.
4. BullMQ: 3 attempts, exponential backoff.

### Step 4 - Frontend Plan Gates (Day 3-4)
1. PlanLimitBanner component for project + article limits.
2. Disable "New Article" CTA when user.articleCredits = 0.
3. Upgrade modal with plan comparison table (3 tiers).
4. Credit counter in header: "X / Y articles this month".

### Step 5 - Error Handling Polish (Day 4-5)
1. Structured error codes in all 403/429 responses.
2. API client: CreditExhaustedError, PlanLimitError, RateLimitError classes.
3. Toast: rate limit shows countdown timer using retryAfter field.
4. Sentry integration for unhandled server errors (5xx).

### Step 6 - Final QA & Polish (Day 5)
1. End-to-end test: keyword -> outline -> content -> SEO check -> WP publish.
2. Load test: 10 concurrent users, all 5 steps.
3. Security headers audit: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
4. PostHog events: step_completed, published, plan_upgrade_clicked.

---

## Todo List

### Rate Limiting
- [ ] RateLimitGuard (Redis sorted set sliding window)
- [ ] @RateLimit() decorator
- [ ] Apply to all AI + publish endpoints
- [ ] Integration test: limit + 429 response

### Plan Enforcement
- [ ] PlanGuard (project count + credit check)
- [ ] @PlanCheck() decorator
- [ ] CreditService: Lua atomic deduction + DB sync
- [ ] Monthly credit reset @Cron
- [ ] PLAN_LIMITS used across all guards

### Publish Pipeline
- [ ] ExportHistory PENDING/SUCCESS/FAILED/PARTIAL statuses
- [ ] Idempotency check on WORDPRESS publish
- [ ] POST /articles/:id/retry-publish
- [ ] BullMQ 3 retries with exponential backoff

### Frontend
- [ ] PlanLimitBanner (project + article limits)
- [ ] Disable "New Article" at credit = 0
- [ ] Upgrade modal with plan comparison
- [ ] Credit counter in header
- [ ] Retry publish button for PARTIAL/FAILED

### Error Handling
- [ ] Structured error codes across all 403/429 responses
- [ ] API client error class hierarchy
- [ ] Rate limit toast with retryAfter countdown
- [ ] Sentry for 5xx errors

### Analytics (PostHog)
- [ ] article_created event
- [ ] step_completed(step: 1-5) event
- [ ] published event (with plan tier)
- [ ] plan_upgrade_clicked event
- [ ] User property: plan, articleCreditsRemaining

---

## Success Criteria
- 11th request in a 60s window returns HTTP 429 with retryAfter field
- Article creation beyond plan limit returns HTTP 403 with upgradeUrl
- Credit deduction is atomic (no race condition under concurrent load)
- PARTIAL publish state allows retry without creating duplicate WP post
- Monthly cron resets credits to plan default on 1st of month
- All 5 article steps complete end-to-end in < 2 minutes total
- Security headers pass Mozilla Observatory (A grade)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Redis credit key evicted | Low | Medium | DB is source of truth; re-prime on miss |
| Cron double-fires on restart | Low | High | Idempotent reset (set, not increment) |
| Rate limit bypass via IP rotation | Low | Low | Rate limit by userId (primary), IP (secondary) |
| Lua script incompatibility | Low | Low | Test on Redis 7; use EVAL not EVALSHA initially |

---

## Security Considerations
- Rate limiting by userId (auth) + IP (anon fallback)
- Lua atomic operations prevent TOCTOU on credit deduction
- Plan limits enforced server-side ONLY; never trust client claims
- Upgrade URL in 403 is hardcoded, never from user input
- PostHog: EU region endpoint, IP anonymization, no PII in events
- CSP: default-src 'self'; script-src 'self'; connect-src api.posthog.com

---

## Launch Checklist
- [ ] All 6 phases complete + tested
- [ ] Docker Compose production config (no dev mounts)
- [ ] Dokploy deployment pipelines configured
- [ ] ENCRYPTION_KEY, API keys in secrets manager (not .env file)
- [ ] PostgreSQL backup schedule (daily, 7-day retention)
- [ ] Redis persistence: AOF enabled
- [ ] Monitoring: uptime check on /health endpoint
- [ ] Rate limit alerts: > 100 429s/min triggers PagerDuty

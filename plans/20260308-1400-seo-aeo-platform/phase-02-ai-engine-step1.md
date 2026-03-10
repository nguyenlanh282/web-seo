# Phase 02 - AI Engine + Step 1 Keyword Analysis
> Weeks 3-4 | Priority: P0 | Status: Pending

## Context Links
- Previous phase: [phase-01-foundation.md](./phase-01-foundation.md)
- Next phase: [phase-03-editor-steps-2-3.md](./phase-03-editor-steps-2-3.md)
- PRD v4: D:/WEB-SEO/seo-aeo-prd_4.md

---

## Overview
Build the async AI pipeline backbone. Every long-running operation (SERP fetch,
Claude completion, outline generation, content writing) runs as a BullMQ job.
The frontend subscribes to SSE to receive live progress. This phase delivers the
complete infrastructure AND Step 1 (Keyword Analysis + SERP Reverse Engineering).

**Step 1 target latency**: 15-30 seconds end-to-end.
**State transition**: DRAFT -> KEYWORD_ANALYZED

---

## Key Insights
- BullMQ requires a dedicated Redis connection (separate from cache).
- SSE (GET /articles/:id/stream) is simpler than WebSockets for one-way push.
- SerpAPI responses are cached in Redis (TTL 24h) to avoid redundant API calls.
- Claude Sonnet `stream: true` lets us forward partial tokens via SSE for UX.
- Idempotency: if the job for an article already exists and is active, return
  its existing jobId rather than enqueuing a duplicate.
- Retry policy: 3 attempts, exponential backoff 5s/25s/125s.

---

## Requirements
- [ ] BullMQ QueueModule (ai-jobs queue, serp-jobs queue)
- [ ] SSE endpoint: GET /articles/:id/stream (auth-gated)
- [ ] SerpAPI service with Redis cache (TTL 24h)
- [ ] AnthropicService wrapping Claude SDK
- [ ] Step 1 BullMQ processor: SerpAnalysisProcessor
- [ ] Keyword model + ArticleKeyword pivot stored in DB after job
- [ ] Article transitions to KEYWORD_ANALYZED on success
- [ ] Progress events: {type, step, progress, data, error}
- [ ] Dead-letter queue for failed jobs

---

## Architecture

### Job Queue Architecture
```
Client                  API Server              Redis/BullMQ
  |                        |                        |
  |-- POST /step1 -------> |                        |
  |                        |-- enqueue job -------> |
  |<-- {jobId} ----------- |                        |
  |                        |                        |
  |-- GET /stream -------> |                        |
  |   (SSE)                |                        |
  |                        |<-- job starts -------- |
  |<-- event:started ----- |                        |
  |                        |-- call SerpAPI ------> (external)
  |<-- event:progress(30%) |                        |
  |                        |-- call Claude -------> (external)
  |<-- event:progress(80%) |                        |
  |                        |-- update DB ---------->|
  |<-- event:completed ---- |                       |
```

### BullMQ Module Setup (apps/api/src/queue/queue.module.ts)
```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { url: cfg.get('REDIS_URL') },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'ai-jobs' },
      { name: 'serp-jobs' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

### SSE Endpoint Pattern
```typescript
@Get(':id/stream')
@UseGuards(JwtAuthGuard)
@Sse()
async streamArticle(
  @Param('id') id: string,
  @GetUser() user: User,
): Promise<Observable<MessageEvent>> {
  await this.articlesService.assertOwnership(id, user.id);
  return new Observable(subscriber => {
    const key = `article:${id}:progress`;
    const sub = this.redisService.subscribe(key, (msg) => {
      subscriber.next({ data: msg });
      const parsed = JSON.parse(msg);
      if (parsed.type === 'COMPLETED' || parsed.type === 'FAILED') {
        subscriber.complete();
      }
    });
    return () => sub.unsubscribe();
  });
}
```

### Step 1 Processor (serp-analysis.processor.ts)
```typescript
@Processor('serp-jobs')
export class SerpAnalysisProcessor extends WorkerHost {
  async process(job: Job<Step1JobData>): Promise<Step1Result> {
    const { articleId, keyword, locale } = job.data;

    // 1. Fetch SERP results (cached)
    await this.emit(articleId, 'PROGRESS', 20, 'Fetching SERP data...');
    const serp = await this.serpService.search(keyword, locale);

    // 2. Analyse with Claude Sonnet
    await this.emit(articleId, 'PROGRESS', 50, 'Analysing competitors...');
    const analysis = await this.claudeService.analyze(serp, keyword);

    // 3. Persist to DB
    await this.emit(articleId, 'PROGRESS', 90, 'Saving results...');
    await this.keywordService.saveAnalysis(articleId, analysis);
    await this.articlesService.transition(articleId, ArticleState.KEYWORD_ANALYZED);

    await this.emit(articleId, 'COMPLETED', 100, 'Done');
    return analysis;
  }

  private async emit(articleId: string, type: string, pct: number, msg: string) {
    await this.redis.publish(`article:${articleId}:progress`,
      JSON.stringify({ type, progress: pct, message: msg }));
  }
}
```

### SerpAPI Service with Cache
```typescript
@Injectable()
export class SerpService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async search(keyword: string, locale = 'vi'): Promise<SerpResult> {
    const cacheKey = `serp:${locale}:${keyword}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const params = new URLSearchParams({
      q: keyword, hl: locale, gl: 'vn',
      api_key: this.config.get('SERPAPI_KEY'),
      num: '10',
    });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    const data = await res.json();
    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 86400); // 24h TTL
    return data;
  }
}
```

### Claude Sonnet Integration
```typescript
@Injectable()
export class AnthropicService {
  private client: Anthropic;

  constructor(private cfg: ConfigService) {
    this.client = new Anthropic({ apiKey: cfg.get('ANTHROPIC_API_KEY') });
  }

  async analyze(serpData: SerpResult, keyword: string): Promise<KeywordAnalysis> {
    const message = await this.client.messages.create({
      model: AI_MODELS.sonnet,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: buildStep1Prompt(keyword, serpData),
      }],
    });
    return parseStep1Response(message.content[0].text);
  }
}
```

---

## Claude Prompt Engineering - Step 1

### Step 1 System Prompt (Vietnamese)
```
You are an expert Vietnamese SEO analyst. Given a target keyword and the top 10
SERP results, extract:
1. Primary keyword and 5-10 LSI (Latent Semantic Index) keywords in Vietnamese
2. Average word count of top-ranking articles
3. Common headings (H2/H3) used across results
4. Content gaps: topics present in <3 results (opportunity areas)
5. Recommended meta description (150-160 chars, Vietnamese)
6. PAA (People Also Ask) questions if available in SERP

Respond in valid JSON matching the KeywordAnalysis schema.
```

### KeywordAnalysis Schema (packages/shared)
```typescript
export interface KeywordAnalysis {
  primaryKeyword:    string;
  lsiKeywords:       string[];
  avgWordCount:      number;
  commonHeadings:    string[];
  contentGaps:       string[];
  metaDescSuggestion:string;
  paaQuestions:      string[];
  serpUrls:          string[];
  difficulty:        'LOW' | 'MEDIUM' | 'HIGH';
}
```

---

## Error Handling & Retry Logic

### Job-Level Error Handling
```typescript
@OnWorkerEvent('failed')
async onFailed(job: Job, error: Error) {
  this.logger.error(`Job ${job.id} failed: ${error.message}`);
  await this.emit(job.data.articleId, 'FAILED', 0, error.message);
  // Article stays in current state; user can retry
}
```

### SerpAPI Error Wrapping
```typescript
async search(keyword: string): Promise<SerpResult> {
  try {
    // ... fetch
  } catch (err) {
    if (err.status === 429) throw new TooManyRequestsException('SerpAPI rate limit');
    if (err.status === 401) throw new UnauthorizedException('SerpAPI key invalid');
    throw new ServiceUnavailableException('SerpAPI unavailable');
  }
}
```

### Claude SDK Error Handling
```typescript
try {
  const msg = await this.client.messages.create({...});
  return msg;
} catch (err) {
  if (err instanceof Anthropic.RateLimitError)
    throw new TooManyRequestsException('Claude rate limit - retry in 60s');
  if (err instanceof Anthropic.APIError && err.status >= 500)
    throw new ServiceUnavailableException('Claude API error');
  throw err;
}
```

---

## AILog Model (audit trail)
```typescript
// Saved after every Claude call
await prisma.aILog.create({ data: {
  userId,
  articleId,
  model: AI_MODELS.sonnet,
  step: 'KEYWORD_ANALYSIS',
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  latencyMs: Date.now() - start,
}});
```

---

## Implementation Steps

### Step 1 - Queue Infrastructure (Day 1)
1. `pnpm add @nestjs/bullmq bullmq` in apps/api.
2. Create QueueModule with ai-jobs and serp-jobs queues.
3. Create RedisService (ioredis) for pub/sub (separate from BullMQ connection).
4. Add REDIS_URL to .env.

### Step 2 - SSE Infrastructure (Day 1-2)
1. Install `@nestjs/event-emitter` (or use ioredis pub/sub directly).
2. Add SSE endpoint GET /articles/:id/stream with Observable.
3. Write SSE integration test with EventSource mock.
4. Frontend: use EventSource API to subscribe in React hook.

### Step 3 - SerpAPI Service (Day 2)
1. `pnpm add serpapi` or use raw fetch with SERPAPI_KEY.
2. SerpService.search(keyword, locale): check Redis cache first.
3. Map raw SerpAPI response to our clean SerpResult interface.
4. Write unit test with mocked fetch.

### Step 4 - AnthropicService (Day 2-3)
1. `pnpm add @anthropic-ai/sdk` in apps/api.
2. AnthropicService.analyze(serpData, keyword): call Claude Sonnet.
3. Parse JSON response with zod schema validation.
4. Log to AILog model after every call.

### Step 5 - Step 1 Processor (Day 3-4)
1. SerpAnalysisProcessor: BullMQ worker that orchestrates serp + claude.
2. Emit Redis pub/sub events at 20%, 50%, 90%, 100%.
3. Save KeywordAnalysis to DB (Keyword + ArticleKeyword rows).
4. Call articlesService.transition(id, KEYWORD_ANALYZED).

### Step 6 - API Endpoint + Frontend (Day 4-5)
1. POST /articles/:id/step1 { keyword } -> enqueues job, returns { jobId }.
2. Frontend: fires POST, then opens EventSource to /articles/:id/stream.
3. Progress bar component reads SSE events (progress 0-100).
4. On COMPLETED: refetch article state; enable Step 2 button.

---

## Todo List

### Queue Infrastructure
- [ ] QueueModule with BullMQ for ai-jobs, serp-jobs
- [ ] RedisService for pub/sub (ioredis)
- [ ] Job default options: 3 attempts, exponential backoff
- [ ] Dead-letter queue configuration

### SSE
- [ ] GET /articles/:id/stream endpoint (auth-gated, SSE)
- [ ] Redis pub/sub subscriber in SSE observable
- [ ] Auto-close stream on COMPLETED/FAILED events
- [ ] useSEEStream() React hook for frontend

### SerpAPI
- [ ] SerpService.search() with Redis cache (TTL 24h)
- [ ] SerpResult type mapping
- [ ] Error handling (429, 401, 5xx)
- [ ] Unit tests with mocked responses

### Anthropic
- [ ] AnthropicService with Anthropic SDK
- [ ] Step 1 system prompt in Vietnamese
- [ ] Zod schema for KeywordAnalysis JSON parsing
- [ ] AILog persistence after each call
- [ ] Rate limit error handling

### Step 1 Processor
- [ ] SerpAnalysisProcessor (@Processor('serp-jobs'))
- [ ] Progress event emission at key milestones
- [ ] DB persistence: Keyword + ArticleKeyword rows
- [ ] Article state transition on success
- [ ] OnWorkerEvent('failed') handler

### Frontend - Step 1 UI
- [ ] Keyword input form
- [ ] POST /step1 trigger
- [ ] SSE progress bar component
- [ ] KeywordAnalysis results display
- [ ] LSI keywords chips, content gaps list, PAA questions

---

## Success Criteria
- POST /articles/:id/step1 enqueues job in < 200ms
- SSE stream delivers COMPLETED event within 30s
- Redis cache prevents duplicate SerpAPI calls for same keyword
- Article state changes to KEYWORD_ANALYZED in DB
- Failed jobs emit FAILED event and article remains in DRAFT
- AILog record created for every Claude call

---

## Security Considerations
- SERPAPI_KEY and ANTHROPIC_API_KEY only in server env, never exposed to client
- SerpAPI cache key uses keyword hash to avoid cache poisoning
- BullMQ job data does not store API keys
- SSE endpoint requires valid JWT (JwtAuthGuard)
- Article ownership verified before enqueuing job

---

## Next Steps -> Phase 3
- Step 2: Outline Generator + Content Gap Detection
- Step 3: Multi-section Content Writer (longest Claude call)
- TipTap editor setup in frontend
- AI bubble menu actions (rewrite/expand/simplify/humanize)

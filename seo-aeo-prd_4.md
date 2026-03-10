# PRD v4: NỀN TẢNG VIẾT BÀI CHUẨN SEO + AEO — PRODUCTION-READY

> **Phiên bản:** 4.0 — Production-Ready  
> **Thay đổi v3 → v4:** API Contracts, Article State Machine, Async Job Rules, Idempotency & Partial Failure, DB Indexes, Readability Spec, Plan Enforcement, Testing Strategy, Non-Functional Requirements

---

# PHẦN I: PRODUCT OVERVIEW

## 1. TỔNG QUAN

### 1.1 Mục tiêu
SaaS platform hỗ trợ viết bài blog chuẩn SEO + AEO. Tích hợp AI: phân tích SERP, phát hiện content gap, viết nội dung E-E-A-T, kiểm tra SEO realtime, xuất bài 1-click lên WordPress với auto internal link.

### 1.2 Đối tượng
- Content Writer / SEO Specialist
- Chủ doanh nghiệp SME
- Marketing Agency

### 1.3 Phân pha

**V1 — MVP (8-10 tuần, 3 dev)**

| Bước | Tính năng | Ưu tiên |
|------|-----------|---------|
| 1 | Keyword Analysis + SERP Reverse Engineering | P0 |
| 2 | Outline Generator + Content Gap Detection | P0 |
| 3 | Content Writer + AI Editor Actions | P0 |
| 4 | SEO Checker Realtime (12 items) + Readability | P0 |
| 5 | Export HTML + WordPress 1-Click Publish | P0 |

**V2 — Growth (sau 2-3 tháng):** AEO Advanced, Topic Cluster, Plagiarism Check, SERP Rank Tracking, Bulk Generation, Content Calendar, Team Collaboration, n8n Webhook.

### 1.4 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | NestJS + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI | Anthropic Claude API (Sonnet for writing, Haiku for editor actions) |
| Search | SerpAPI |
| Editor | TipTap + AI Inline Actions |
| Auth | NextAuth.js (Google + Email) |
| Queue | BullMQ |
| Realtime | Server-Sent Events (SSE) |
| Logging | Pino |
| Analytics | PostHog |
| Deploy | Docker + Dokploy |

### 1.5 SaaS Pricing

| | Starter $19/mo | Pro $49/mo | Agency $149/mo |
|--|---|---|---|
| Bài viết/tháng | 30 | 100 | Unlimited (fair use: 500) |
| Projects | 2 | 10 | Unlimited |
| SERP Analysis | ✅ | ✅ | ✅ |
| Content Gap | ❌ | ✅ | ✅ |
| AI Editor Actions | Rewrite only | Full 4 | Full 4 |
| Internal Link Engine | Manual | AI suggest | AI auto |
| WordPress Export | HTML only | 1 site | Unlimited sites |
| 1-Click Publish | ❌ | ✅ | ✅ |
| Reverse Links | ❌ | ❌ | ✅ |

---

# PHẦN II: ARTICLE STATE MACHINE

## 2. TRẠNG THÁI BÀI VIẾT

### 2.1 State Diagram

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
  ┌───────┐   step1   ┌──────────────────┐   step2   ┌────────────┐
  │ DRAFT │ ────────→ │ KEYWORD_ANALYZED │ ────────→ │  OUTLINED  │
  └───────┘           └──────────────────┘           └────────────┘
      ▲                       │                            │
      │                       │ (edit → back to DRAFT)     │ step3
      │                       ▼                            ▼
      │               ┌──────────────────┐         ┌────────────────┐
      └────────────── │     (rollback)   │         │CONTENT_WRITTEN │
                      └──────────────────┘         └────────────────┘
                                                          │
                                                          │ step4
                                                          ▼
                                                   ┌─────────────┐
                                                   │ SEO_CHECKED │
                                                   └─────────────┘
                                                          │
                                                          │ step5 / one-click
                                                          ▼
                                                   ┌───────────┐
                                                   │ EXPORTED  │
                                                   └───────────┘
                                                          │
                                                          │ confirm publish
                                                          ▼
                                                   ┌───────────┐
                                                   │ PUBLISHED │
                                                   └───────────┘
```

### 2.2 Transition Rules

| From | To | Trigger | Condition |
|------|----|---------|-----------|
| DRAFT | KEYWORD_ANALYZED | step1-analyze complete | — |
| KEYWORD_ANALYZED | OUTLINED | step2-outline complete | step1 phải xong |
| OUTLINED | CONTENT_WRITTEN | step3-write complete | step2 phải xong |
| CONTENT_WRITTEN | SEO_CHECKED | step4-seo-check complete | step3 phải xong |
| SEO_CHECKED | EXPORTED | step5-export complete | step4 phải xong |
| EXPORTED | PUBLISHED | WordPress publish confirmed | wpPostId tồn tại |
| Any (trừ PUBLISHED) | DRAFT | user manual reset | User xác nhận |

### 2.3 Rules bổ sung

| Rule | Giải thích |
|------|-----------|
| Autosave KHÔNG đổi status | Chỉ cập nhật contentDraft + lastAutoSavedAt |
| User có thể quay lại bước trước | Status giữ nguyên, nội dung bước trước có thể chỉnh |
| Re-run step đã xong | Được phép, status giữ nguyên hoặc cập nhật lại |
| one-click-publish | Yêu cầu tối thiểu status ≥ CONTENT_WRITTEN, seoScore ≥ 60 |
| PUBLISHED → edit lại | Status chuyển về CONTENT_WRITTEN, bài WP giữ nguyên cho đến khi re-export |

---

# PHẦN III: API CONTRACTS

## 3. CONVENTIONS CHUNG

### 3.1 Response Envelope

Mọi API response tuân theo format:

```typescript
// Success (sync)
{
  "success": true,
  "data": { ... }
}

// Success (async job)
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "PROCESSING",
    "pollUrl": "/api/jobs/job_abc123"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": [{ "field": "title", "issue": "required" }]
  }
}
```

### 3.2 Error Codes

| HTTP | Code | Khi nào |
|------|------|---------|
| 400 | VALIDATION_ERROR | Input không hợp lệ |
| 401 | UNAUTHORIZED | Chưa đăng nhập |
| 403 | FORBIDDEN | Không có quyền (plan, owner) |
| 404 | NOT_FOUND | Resource không tồn tại |
| 409 | CONFLICT | Trùng slug, job đang chạy |
| 422 | INVALID_STATE | Sai trạng thái (ví dụ: chưa qua step1 mà gọi step2) |
| 429 | RATE_LIMITED | Quá giới hạn AI request |
| 500 | INTERNAL_ERROR | Lỗi server |
| 502 | AI_ERROR | AI API fail sau retry |
| 504 | TIMEOUT | Job vượt timeout |

### 3.3 Phân loại Sync / Async

| API | Type | Lý do |
|-----|------|-------|
| POST step1-analyze | **ASYNC** | SERP fetch + AI analysis: 15-30s |
| POST step2-outline | **ASYNC** | AI outline + content gap: 10-20s |
| POST step3-write | **ASYNC** | Multi-section AI write: 30-60s |
| POST step4-seo-check | **SYNC** | Tính toán logic, không gọi AI: <1s |
| POST step5-export (HTML) | **SYNC** | Template render: <1s |
| POST step5-export (WordPress) | **ASYNC** | Upload media + API calls: 5-15s |
| POST one-click-publish | **ASYNC** | Multi-step pipeline: 30-90s |
| POST ai/rewrite | **SYNC** | Single AI call, nhỏ: 3-5s |
| POST ai/expand | **SYNC** | Single AI call: 3-5s |
| POST ai/simplify | **SYNC** | Single AI call: 3-5s |
| POST ai/humanize | **SYNC** | Single AI call: 3-5s |
| POST ai/suggest-links | **SYNC** | Single AI call: 3-5s |
| PUT autosave | **SYNC** | DB write only: <200ms |

### 3.4 Async Job Protocol

```
1. Client gọi POST → nhận { jobId, status: "PROCESSING", pollUrl }
2. Client kết nối SSE: GET /api/jobs/:jobId/stream
3. Server gửi events qua SSE:
   - event: progress  data: { step: "fetching_serp", progress: 20 }
   - event: progress  data: { step: "analyzing_entities", progress: 60 }
   - event: complete  data: { result: {...} }
   - event: failed    data: { error: {...} }
4. Fallback: Client poll GET /api/jobs/:jobId mỗi 3s nếu SSE disconnect
```

```typescript
// Job Status Response
interface JobStatus {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  progress: number;        // 0-100
  currentStep: string;     // human-readable step name
  result?: any;            // khi COMPLETED
  error?: {                // khi FAILED
    code: string;
    message: string;
    failedAtStep: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Job Rules:**

| Rule | Value |
|------|-------|
| Timeout | 120s (default), 180s (one-click-publish) |
| Retry per AI call | 3 lần, exponential backoff (1s, 2s, 4s) |
| Max concurrent jobs/user | 3 |
| Job retention | 24h (completed), 7 days (failed) |
| Stale job cleanup | Mỗi 5 phút, jobs > timeout → mark TIMEOUT |

---

## 4. API CONTRACTS CHI TIẾT

### 4.1 Step 1: Keyword + SERP Analysis

```
POST /api/articles/:id/step1-analyze
Type: ASYNC
Auth: JWT
Plan: All plans
Credit: Trừ 1 article credit
```

**Request:**

```typescript
{
  focusKeyword: string;          // required, 1-200 chars
  domain?: string;               // optional, tên domain để filter SERP
  language?: string;             // default: "vi"
  country?: string;              // default: "vn"
}
```

**Success Response (202):**

```typescript
{
  success: true,
  data: {
    jobId: "job_abc123",
    status: "PROCESSING",
    pollUrl: "/api/jobs/job_abc123"
  }
}
```

**Job Result (khi COMPLETED):**

```typescript
{
  keywords: {
    primary: { keyword: string, volume: number, difficulty: number },
    secondary: { keyword: string, volume: number }[],
    longTail: string[],
    questions: string[],
  },
  searchIntent: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL",
  sgeIntent: {
    commonQuestions: string[],
    conversationalQueries: string[],
  },
  serpAnalysis: {
    serpBenchmark: {
      avgWordCount: number,
      avgH2Count: number,
      avgH3Count: number,
      avgImages: number,
      avgFaqCount: number,
      avgInternalLinks: number,
      percentWithFaq: number,
    },
    topResults: {
      position: number,
      title: string,
      url: string,
      wordCount: number,
      headings: string[],
      h2Count: number,
      imageCount: number,
      hasFaq: boolean,
    }[],
    entityGraph: {
      entity: string,
      frequency: number,      // x/10 trang
      inHeading: boolean,
    }[],
  },
  contentDirection: string,
}
```

**Errors:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 400 | VALIDATION_ERROR | focusKeyword trống hoặc > 200 chars |
| 403 | PLAN_CREDIT_EXCEEDED | Hết credit tháng này |
| 409 | JOB_ALREADY_RUNNING | Bài này đang có job step1 chạy |
| 422 | INVALID_STATE | Article đã PUBLISHED |
| 502 | SERP_API_ERROR | SerpAPI fail |
| 502 | AI_ERROR | Claude API fail sau 3 retry |

---

### 4.2 Step 2: Outline + Content Gap

```
POST /api/articles/:id/step2-outline
Type: ASYNC
Auth: JWT
Plan: All plans
```

**Request:**

```typescript
{
  customInstructions?: string;   // optional, hướng dẫn thêm cho outline
  includeContentGap?: boolean;   // default: true (Pro/Agency only)
}
```

**Precondition:** `status >= KEYWORD_ANALYZED` (422 nếu không đạt)

**Job Result:**

```typescript
{
  outline: {
    h1: string,
    titleTag: string,              // ≤ 60 chars
    metaDescription: string,       // ≤ 155 chars
    snippetAnswer: string,         // 40-60 từ
    sections: {
      id: string,
      h2: string,
      miniSummary: string,         // 30-40 từ
      estimatedWords: number,      // word budget
      bulletInsights: string[],
      subsections: {
        id: string,
        h3: string,
        keyPoints: string[],
        estimatedWords: number,
      }[],
    }[],
    intro: { keyPoints: string[], estimatedWords: number },
    conclusion: { keyPoints: string[], estimatedWords: number },
    targetTotalWords: number,
    faq: { question: string, answerBrief: string }[],
  },
  contentGaps?: {                  // Pro/Agency only
    gaps: {
      topic: string,
      importance: "HIGH" | "MEDIUM" | "LOW",
      serpFrequency: number,
      suggestedHeading: string,
      suggestedContent: string,
      estimatedWords: number,
    }[],
    missingHeadings: string[],
  },
}
```

**Errors:** 400, 403 (plan), 409 (job running), 422 (INVALID_STATE: chưa qua step1)

---

### 4.3 Step 3: Content Writer

```
POST /api/articles/:id/step3-write
Type: ASYNC
Auth: JWT
Plan: All plans
```

**Request:**

```typescript
{
  brandVoice?: string;           // default: "chuyên gia, thân thiện, uy tín"
  referenceContent?: string;     // optional, tài liệu tham khảo, ≤ 20,000 chars
  outlineOverride?: object;      // optional, nếu user đã chỉnh outline
}
```

**Precondition:** `status >= OUTLINED`

**Job Result:**

```typescript
{
  contentMarkdown: string,       // Full Markdown content
  wordCount: number,
  sections: {
    heading: string,
    wordCount: number,           // Actual vs budget
    budgetMet: boolean,          // ±20% of estimatedWords
  }[],
}
```

**Job Internals (N sub-tasks):**

```
Sub-job 1: AI outline expansion (1 call)
Sub-job 2..N: AI paragraph writer (1 call per section)

SSE events:
  { step: "expanding_outline", progress: 10 }
  { step: "writing_section", sectionIndex: 0, sectionTitle: "SEO là gì", progress: 25 }
  { step: "writing_section", sectionIndex: 1, sectionTitle: "Cách làm SEO", progress: 45 }
  ...
  { step: "assembling", progress: 90 }
  { step: "complete", progress: 100 }
```

---

### 4.4 Step 4: SEO Check (Realtime)

```
POST /api/articles/:id/step4-seo-check
Type: SYNC
Auth: JWT
Plan: All plans
```

**Request:** (empty body — check dựa trên article hiện tại)

**Precondition:** `status >= CONTENT_WRITTEN`

**Response (200):**

```typescript
{
  success: true,
  data: {
    seoScore: number,              // 0-100 weighted
    readabilityScore: number,      // 0-100
    readabilityGrade: string,      // "Dễ đọc", "Trung bình"...
    checklist: {
      checkType: ChecklistType,
      status: "PASS" | "WARNING" | "FAIL" | "PENDING",
      score: number,               // 0-100
      weight: number,              // trọng số
      weightedContribution: number,// (score/100) × weight
      details: string,
      suggestion?: string,         // gợi ý fix
    }[],
    serpComparison?: {             // nếu có SERP data
      metric: string,
      serpAvg: number,
      yours: number,
      status: "OK" | "LOW" | "HIGH",
    }[],
  }
}
```

---

### 4.5 Step 5: Export

#### 4.5a Export HTML (SYNC)

```
GET /api/articles/:id/export/html?format=clean|wordpress-classic|gutenberg
Type: SYNC
Auth: JWT
Plan: All plans (HTML)
```

**Response (200):** `Content-Type: text/html` — HTML string

#### 4.5b Export HTML Download (SYNC)

```
GET /api/articles/:id/export/html/download?format=clean|wordpress-classic|gutenberg
Type: SYNC
Auth: JWT
```

**Response (200):** `Content-Disposition: attachment; filename="slug.html"` — file download

#### 4.5c Export WordPress (ASYNC)

```
POST /api/articles/:id/export/wordpress
Type: ASYNC
Auth: JWT
Plan: Pro/Agency
```

**Request:**

```typescript
{
  connectionId: string;          // required
  wpStatus: "draft" | "pending" | "publish";  // required
  htmlFormat: "classic" | "gutenberg";         // required
  categories?: number[];
  tags?: string[];
  featuredImageUrl?: string;
  idempotencyKey?: string;       // optional, client-generated UUID
}
```

**Job Result:**

```typescript
{
  wpPostId: number,
  wpPostUrl: string,
  wpStatus: string,
  mediaUploaded: number,
  isUpdate: boolean,             // true nếu update bài cũ
}
```

#### 4.5d One-Click Publish (ASYNC)

```
POST /api/articles/:id/one-click-publish
Type: ASYNC
Auth: JWT
Plan: Pro/Agency
```

**Request:**

```typescript
{
  connectionId: string;
  wpStatus: "draft" | "publish";
  idempotencyKey: string;        // REQUIRED — client-generated UUID
}
```

**Precondition:** `status >= CONTENT_WRITTEN` AND `seoScore >= 60`

**Job Steps & SSE Events:**

```typescript
// 6 steps, mỗi step gửi SSE event
{ step: "validating",           progress: 5,  message: "Kiểm tra bài viết" }
{ step: "auto_fix_seo",        progress: 20, message: "Tự động sửa SEO" }
{ step: "auto_internal_links",  progress: 40, message: "Thêm internal links" }
{ step: "generate_html",        progress: 55, message: "Tạo HTML + Schema" }
{ step: "publish_wordpress",    progress: 75, message: "Đăng lên WordPress" }
{ step: "reverse_links",        progress: 90, message: "Cập nhật bài cũ" }
{ step: "complete",             progress: 100 }
```

**Job Result:**

```typescript
{
  wpPostId: number,
  wpPostUrl: string,
  seoScoreBefore: number,
  seoScoreAfter: number,
  autoFixCount: number,
  internalLinksAdded: number,
  reverseLinksUpdated: number,
  overallStatus: "SUCCESS" | "PARTIAL_SUCCESS",
  stepResults: {
    step: string,
    status: "SUCCESS" | "FAILED" | "SKIPPED",
    details?: string,
  }[],
}
```

---

### 4.6 AI Editor Actions

Tất cả là SYNC, trả kết quả trực tiếp (3-5s).

```
POST /api/ai/rewrite
POST /api/ai/expand
POST /api/ai/simplify
POST /api/ai/humanize
Auth: JWT
Plan: rewrite = All, expand/simplify/humanize = Pro/Agency
Rate limit: 10/phút
Credit: KHÔNG trừ article credit (trừ AI request quota riêng)
```

**Request (chung):**

```typescript
{
  articleId?: string;            // optional, để context
  text: string;                  // required, 10-5,000 chars
  keywords?: string[];           // optional, để giữ từ khóa
  tone?: string;                 // optional, chỉ cho rewrite
  wordBudget?: number;           // optional, chỉ cho expand (default: 150)
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    result: string,              // text đã xử lý
    wordCountBefore: number,
    wordCountAfter: number,
  }
}
```

**Errors:**

| HTTP | Code | Khi nào |
|------|------|---------|
| 400 | VALIDATION_ERROR | text < 10 chars hoặc > 5,000 chars |
| 403 | PLAN_REQUIRED | expand/simplify/humanize cần Pro+ |
| 429 | RATE_LIMITED | > 10 requests/phút |
| 502 | AI_ERROR | Claude fail sau 3 retry |

---

### 4.7 Internal Link Engine

```
GET /api/articles/:id/link-suggestions
Type: SYNC (AI call, 3-8s)
Auth: JWT
Plan: Pro/Agency
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    suggestions: {
      targetArticleId: string,
      targetTitle: string,
      targetUrl: string,
      anchorText: string,
      contextSentence: string,     // Câu chứa anchor text
      insertAfterHeading: string,
      relevanceScore: number,      // 0-1
      reason: string,
    }[],
  }
}
```

```
POST /api/articles/:id/links
Auth: JWT
```

**Request:**

```typescript
{
  targetArticleId: string;
  anchorText: string;
  contextSentence?: string;
}
```

---

### 4.8 Autosave

```
PUT /api/articles/:id/autosave
Type: SYNC
Auth: JWT
```

**Request:**

```typescript
{
  contentDraft?: string;         // ≤ 100,000 chars
  title?: string;
  metaDescription?: string;
  outline?: object;
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    lastAutoSavedAt: string,     // ISO datetime
  }
}
```

**Rules:** Autosave KHÔNG thay đổi article status. Chỉ cập nhật content fields + lastAutoSavedAt.

---

### 4.9 Job Status

```
GET /api/jobs/:jobId
GET /api/jobs/:jobId/stream      // SSE endpoint
Auth: JWT
```

**GET /api/jobs/:jobId Response:**

```typescript
{
  success: true,
  data: {
    jobId: string,
    status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "TIMEOUT",
    progress: number,
    currentStep: string,
    result?: any,
    error?: { code: string, message: string, failedAtStep: string },
    createdAt: string,
    updatedAt: string,
  }
}
```

---

# PHẦN IV: IDEMPOTENCY & PARTIAL FAILURE

## 5. QUY TẮC IDEMPOTENCY

### 5.1 WordPress Publish

| Tình huống | Xử lý |
|-----------|--------|
| Bài chưa từng publish lên WP | Tạo mới (POST /posts) |
| Bài đã có wpPostId trong ExportHistory | Update bài cũ (PUT /posts/:id) |
| User bấm publish 2 lần liên tiếp | idempotencyKey check → reject nếu job trước đang chạy (409 CONFLICT) |
| 2 user bấm publish cùng lúc | Redis lock trên articleId, user thứ 2 nhận 409 |

### 5.2 Idempotency Key Flow

```typescript
// Backend check:
const lockKey = `publish_lock:${articleId}`;
const existing = await redis.set(lockKey, idempotencyKey, 'NX', 'EX', 300);

if (!existing) {
  // Lock đã tồn tại
  const currentKey = await redis.get(lockKey);
  if (currentKey === idempotencyKey) {
    // Cùng idempotencyKey → trả lại job cũ
    return existingJob;
  }
  // Khác key → 409 CONFLICT
  throw new ConflictException('Bài viết đang được publish bởi request khác');
}
```

### 5.3 One-Click Publish — Partial Failure Rules

| Step | Nếu fail | Xử lý |
|------|----------|--------|
| 1. Validate | Fail | Trả lỗi ngay, không chạy tiếp |
| 2. Auto-fix SEO | Fail | **Skip** → tiến tiếp, ghi warning |
| 3. Auto internal links | Fail | **Skip** → tiến tiếp, ghi warning |
| 4. Generate HTML | Fail | **Abort** → không thể publish, trả FAILED |
| 5. Publish WordPress | Fail | **Abort** → trả FAILED, không tiếp |
| 6. Reverse links | Fail | **Skip** → overallStatus = PARTIAL_SUCCESS |

**Rollback rules:**

| Tình huống | Rollback? |
|-----------|----------|
| WP publish thành công nhưng reverse links fail | KHÔNG rollback WP → PARTIAL_SUCCESS |
| WP media upload 2/5 ảnh thành công rồi fail | KHÔNG rollback media → publish với ảnh đã upload, ghi warning |
| WP post tạo thành công nhưng categories fail | KHÔNG rollback post → PARTIAL_SUCCESS, user fix manual |
| HTML generate fail | KHÔNG tạo WP post → FAILED |

**URL cho reverse links:** Sau khi WordPress publish thành công, response trả về `wpPostUrl`. Dùng URL này cho reverse link step. Nếu article chưa có `url` field, cập nhật từ `wpPostUrl`.

---

# PHẦN V: DATABASE

## 6. PRISMA SCHEMA

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USER ====================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatarUrl     String?
  passwordHash  String?
  provider      AuthProvider @default(EMAIL)
  role          UserRole    @default(WRITER)
  
  plan          PlanType    @default(STARTER)
  aiCreditsUsed Int         @default(0)
  aiCreditsLimit Int        @default(30)
  creditsResetAt DateTime?
  
  aiRequestCount  Int       @default(0)
  aiRequestResetAt DateTime?
  
  projects      Project[]
  articles      Article[]
  keywords      Keyword[]
  wpConnections WordPressConnection[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
  @@map("users")
}

enum AuthProvider { EMAIL GOOGLE }
enum UserRole { ADMIN WRITER VIEWER }
enum PlanType { STARTER PRO AGENCY }

// ==================== PROJECT ====================

model Project {
  id          String    @id @default(cuid())
  name        String
  domain      String?
  description String?
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  articles    Article[]
  keywords    Keyword[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, createdAt(sort: Desc)])
  @@map("projects")
}

// ==================== KEYWORD ====================

model Keyword {
  id            String        @id @default(cuid())
  keyword       String
  type          KeywordType
  searchVolume  Int?
  difficulty    Float?
  searchIntent  SearchIntent?
  sgeIntent     String?
  cpc           Float?
  
  projectId     String
  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  
  articles      ArticleKeyword[]
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([keyword, projectId])
  @@index([projectId, type])
  @@map("keywords")
}

enum KeywordType { PRIMARY SECONDARY LONG_TAIL QUESTION }
enum SearchIntent { INFORMATIONAL COMMERCIAL TRANSACTIONAL NAVIGATIONAL }

// ==================== ARTICLE ====================

model Article {
  id              String        @id @default(cuid())
  title           String
  slug            String
  metaDescription String?
  titleTag        String?
  url             String?
  focusKeyword    String?
  
  outline         Json?
  contentDraft    String?       @db.Text
  contentFinal    String?       @db.Text
  
  serpAnalysis     Json?         @default("{}")
  metadata        Json?         @default("{}")
  htmlOutput      String?       @db.Text
  
  wordCount       Int?
  readingTime     Int?
  seoScore        Float?
  readabilityScore Float?
  
  status          ArticleStatus @default(DRAFT)
  currentStep     Int           @default(1)
  
  projectId       String
  project         Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  
  keywords        ArticleKeyword[]
  checklistItems  ChecklistItem[]
  internalLinks   InternalLink[] @relation("SourceArticle")
  linkedFrom      InternalLink[] @relation("TargetArticle")
  images          ArticleImage[]
  aiLogs          AILog[]
  exportHistory   ExportHistory[]
  
  lastAutoSavedAt DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  publishedAt     DateTime?

  @@unique([slug, projectId])
  @@index([projectId, status, updatedAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([projectId, focusKeyword])
  @@map("articles")
}

enum ArticleStatus {
  DRAFT
  KEYWORD_ANALYZED
  OUTLINED
  CONTENT_WRITTEN
  SEO_CHECKED
  EXPORTED
  PUBLISHED
}

// ==================== ARTICLE KEYWORD ====================

model ArticleKeyword {
  id         String      @id @default(cuid())
  articleId  String
  article    Article     @relation(fields: [articleId], references: [id], onDelete: Cascade)
  keywordId  String
  keyword    Keyword     @relation(fields: [keywordId], references: [id], onDelete: Cascade)
  role       KeywordRole @default(SECONDARY)
  
  @@unique([articleId, keywordId])
  @@map("article_keywords")
}

enum KeywordRole { PRIMARY SECONDARY LONG_TAIL LSI }

// ==================== CHECKLIST ====================

model ChecklistItem {
  id          String          @id @default(cuid())
  articleId   String
  article     Article         @relation(fields: [articleId], references: [id], onDelete: Cascade)
  
  checkType   ChecklistType
  status      CheckStatus     @default(PENDING)
  score       Float?
  scoreWeight Float           @default(10)
  details     String?
  suggestion  String?
  autoChecked Boolean         @default(false)
  
  checkedAt   DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([articleId, checkType])
  @@map("checklist_items")
}

enum ChecklistType {
  HEADLINE_KEYWORD
  META_DESCRIPTION
  HEADING_STRUCTURE
  IMAGE_ALT
  IMAGE_FILENAME
  KEYWORD_COVERAGE
  TAGS
  INTERNAL_EXTERNAL_LINKS
  ANCHOR_TEXT
  CONTENT_LENGTH
  READABILITY
  CONTENT_GAP_COVERAGE
}

enum CheckStatus { PENDING PASS WARNING FAIL }

// ==================== INTERNAL LINK ====================

model InternalLink {
  id              String  @id @default(cuid())
  sourceId        String
  source          Article @relation("SourceArticle", fields: [sourceId], references: [id], onDelete: Cascade)
  targetId        String
  target          Article @relation("TargetArticle", fields: [targetId], references: [id], onDelete: Cascade)
  anchorText      String
  contextSentence String?
  
  createdAt       DateTime @default(now())

  @@unique([sourceId, targetId, anchorText])
  @@index([sourceId])
  @@index([targetId])
  @@map("internal_links")
}

// ==================== IMAGE ====================

model ArticleImage {
  id          String  @id @default(cuid())
  articleId   String
  article     Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  fileName    String
  altText     String
  caption     String?
  url         String
  createdAt   DateTime @default(now())

  @@index([articleId])
  @@map("article_images")
}

// ==================== WORDPRESS ====================

model WordPressConnection {
  id               String  @id @default(cuid())
  userId           String
  user             User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  siteName         String
  siteUrl          String
  apiBase          String
  authMethod       WPAuthMethod
  username         String
  appPassword      String
  autoInternalLink Boolean @default(false)
  isActive         Boolean @default(true)
  lastSyncAt       DateTime?
  
  exportHistory    ExportHistory[]
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId, isActive])
  @@map("wordpress_connections")
}

enum WPAuthMethod { APPLICATION_PASSWORD JWT }

// ==================== EXPORT HISTORY ====================

model ExportHistory {
  id              String       @id @default(cuid())
  articleId       String
  article         Article      @relation(fields: [articleId], references: [id], onDelete: Cascade)
  exportType      ExportType
  wpConnectionId  String?
  wpConnection    WordPressConnection? @relation(fields: [wpConnectionId], references: [id])
  wpPostId        Int?
  wpPostUrl       String?
  wpStatus        WPPostStatus?
  htmlVersion     String?
  idempotencyKey  String?
  exportedAt      DateTime     @default(now())
  status          ExportStatus @default(SUCCESS)
  errorMessage    String?

  @@index([articleId, exportedAt(sort: Desc)])
  @@index([idempotencyKey])
  @@map("export_history")
}

enum ExportType { HTML_DOWNLOAD HTML_CLIPBOARD WORDPRESS_DRAFT WORDPRESS_PUBLISH }
enum WPPostStatus { DRAFT PENDING PUBLISH }
enum ExportStatus { SUCCESS FAILED PENDING }

// ==================== AI LOG ====================

model AILog {
  id          String   @id @default(cuid())
  articleId   String?
  article     Article? @relation(fields: [articleId], references: [id], onDelete: Cascade)
  step        Int?
  action      String
  prompt      String   @db.Text
  response    String   @db.Text
  model       String
  tokenInput  Int?
  tokenOutput Int?
  cost        Float?
  durationMs  Int?
  retryCount  Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([articleId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("ai_logs")
}
```

---

# PHẦN VI: CHECKLIST SCORE WEIGHTS

## 7. WEIGHT CONFIGURATION

### 7.1 Quy tắc

| Quyết định | Chọn |
|-----------|------|
| Weight lấy từ đâu? | **Code constants** (không lưu DB từng row) |
| DB field scoreWeight dùng làm gì? | Cache giá trị weight khi tạo ChecklistItem, để query/hiển thị không cần join code |
| Ai seed? | Backend service tự set khi chạy `runFullCheck()` |
| Admin chỉnh weight? | V1: Không. V2: Có (admin panel) |

### 7.2 Weight Table (Code constants)

```typescript
// seo-checker/constants/weights.ts

export const CHECKLIST_WEIGHTS: Record<ChecklistType, number> = {
  HEADLINE_KEYWORD:       12,
  META_DESCRIPTION:       10,
  HEADING_STRUCTURE:      12,
  IMAGE_ALT:              6,
  IMAGE_FILENAME:         4,
  KEYWORD_COVERAGE:       15,
  TAGS:                   4,
  INTERNAL_EXTERNAL_LINKS:12,
  ANCHOR_TEXT:            5,
  CONTENT_LENGTH:         5,
  READABILITY:            10,
  CONTENT_GAP_COVERAGE:   5,
  // TOTAL:              100
};
```

### 7.3 Score Calculation

```typescript
function calculateSeoScore(items: ChecklistItem[]): number {
  let total = 0;
  for (const item of items) {
    const weight = CHECKLIST_WEIGHTS[item.checkType] ?? 0;
    const itemScore = item.score ?? 0;
    total += (itemScore / 100) * weight;
  }
  return Math.round(total); // 0-100
}
```

---

# PHẦN VII: PLAN ENFORCEMENT

## 8. CREDIT & QUOTA RULES

### 8.1 Article Credit

| Câu hỏi | Trả lời |
|---------|---------|
| Credit bị trừ khi nào? | Khi gọi **step1-analyze** thành công (job COMPLETED). Đây là điểm "commit" bài viết. |
| Gọi step1 fail có trừ credit? | KHÔNG. Chỉ trừ khi job COMPLETED. |
| Gọi lại step1 cho bài cũ? | KHÔNG trừ thêm. Mỗi articleId chỉ trừ 1 lần (check flag `creditCharged` trên Article). |
| Editor actions trừ credit? | KHÔNG trừ article credit. Trừ AI request quota riêng (xem 8.2). |
| SERP analysis trừ credit riêng? | KHÔNG. Đi kèm step1, tính chung. |
| Reset credit khi nào? | Đầu mỗi billing cycle (monthly). `creditsResetAt` = ngày đăng ký + 30 ngày. |

### 8.2 AI Request Quota (Rate limit)

| Plan | AI requests/phút | AI requests/ngày |
|------|------------------|-----------------|
| Starter | 10 | 200 |
| Pro | 20 | 1,000 |
| Agency | 30 | 5,000 |

**Editor actions** (rewrite/expand/simplify/humanize/suggest-links) trừ vào AI request quota, KHÔNG trừ article credit.

### 8.3 "Unlimited" cho Agency

| Metric | Limit thật |
|--------|-----------|
| Bài viết/tháng | 500 (fair use, notify khi > 400) |
| WP sites | 50 |
| Projects | 100 |

Nếu vượt fair use → gửi email notification, không block ngay. Block sau 150% limit.

### 8.4 Plan Guard Implementation

```typescript
// common/guards/plan-limit.guard.ts

@Injectable()
export class PlanLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const endpoint = request.route.path;
    
    // Check article credit cho step1
    if (endpoint.includes('step1-analyze')) {
      const article = await this.getArticle(request.params.id);
      
      // Nếu bài này đã từng trừ credit → cho qua
      if (article.creditCharged) return true;
      
      // Check credit
      await this.resetCreditsIfNeeded(user);
      if (user.aiCreditsUsed >= user.aiCreditsLimit) {
        throw new ForbiddenException({
          code: 'PLAN_CREDIT_EXCEEDED',
          message: `Đã dùng hết ${user.aiCreditsLimit} bài viết tháng này.`,
          currentUsage: user.aiCreditsUsed,
          limit: user.aiCreditsLimit,
          resetAt: user.creditsResetAt,
        });
      }
    }
    
    // Check feature access
    const featureMap: Record<string, PlanType[]> = {
      'ai/expand': ['PRO', 'AGENCY'],
      'ai/simplify': ['PRO', 'AGENCY'],
      'ai/humanize': ['PRO', 'AGENCY'],
      'one-click-publish': ['PRO', 'AGENCY'],
      'export/wordpress': ['PRO', 'AGENCY'],
      'link-suggestions': ['PRO', 'AGENCY'],
      'content-gap': ['PRO', 'AGENCY'],
    };
    
    for (const [path, plans] of Object.entries(featureMap)) {
      if (endpoint.includes(path) && !plans.includes(user.plan)) {
        throw new ForbiddenException({
          code: 'PLAN_REQUIRED',
          message: `Tính năng này yêu cầu plan ${plans.join(' hoặc ')}.`,
          requiredPlan: plans[0],
          currentPlan: user.plan,
        });
      }
    }
    
    return true;
  }
}
```

---

# PHẦN VIII: READABILITY SPEC

## 9. ĐẶC TẢ READABILITY CHO TIẾNG VIỆT

### 9.1 Preprocessing (trước khi tính)

| Bước | Xử lý |
|------|--------|
| 1 | Strip Markdown: bỏ `#`, `**`, `*`, `- `, `1. `, `> `, ``` `, `[text](url)` |
| 2 | Strip HTML tags nếu có |
| 3 | Bỏ URLs (regex: `https?://\S+`) |
| 4 | Bỏ code blocks (``` ... ```) |
| 5 | Giữ lại emoji, số liệu, viết tắt (tính là từ) |
| 6 | Normalize whitespace (multiple spaces → single) |

### 9.2 Tách câu (Sentence Splitting)

```typescript
// Tách câu theo:
const SENTENCE_DELIMITERS = /[.!?…。]\s+|[.!?…。]$/;

// KHÔNG tách tại:
// - Dấu "." trong số (3.14, 1.000.000)
// - Dấu "." trong viết tắt (TP., TS., PGS.)
// - Dấu "." trong URL (đã strip ở bước trước)
// - Dấu ":" và ";" → KHÔNG phải end of sentence

// Mỗi bullet point ("- item") tính là 1 câu riêng
// Mỗi numbered item ("1. item") tính là 1 câu riêng
// Heading KHÔNG tính là câu
// Table cells: mỗi cell có "." cuối → 1 câu, không có → KHÔNG tính
```

### 9.3 Đếm từ (Word Counting)

```typescript
// Tiếng Việt: mỗi âm tiết cách nhau bằng space = 1 từ
// "tối ưu hóa" = 3 từ
// "SEO" = 1 từ
// "12.5%" = 1 từ
// Emoji = KHÔNG tính là từ
// "-" đứng đầu bullet = KHÔNG tính

const words = cleanedText
  .split(/\s+/)
  .filter(w => w.length > 0 && !/^[\p{Emoji}]+$/u.test(w) && w !== '-');
```

### 9.4 Đếm âm tiết tiếng Việt

```typescript
// Tiếng Việt là ngôn ngữ đơn âm tiết
// Mỗi "từ" (space-separated) = 1 âm tiết
// Ngoại trừ từ tiếng Anh: dùng heuristic English syllable counter
// Regex detect English: /^[a-zA-Z]+$/

function countSyllables(word: string): number {
  if (/^[a-zA-Z]+$/.test(word)) {
    return countEnglishSyllables(word); // e.g., "optimization" = 5
  }
  return 1; // Tiếng Việt: 1 âm tiết / từ
}
```

### 9.5 Công thức Readability Score

```typescript
// Vietnamese-adapted Flesch Reading Ease
// Vì tiếng Việt đơn âm tiết, syllable ratio gần = 1
// → Trọng tâm vào: câu dài, đoạn dài, cấu trúc

const avgWordsPerSentence = totalWords / totalSentences;

// Base score (Flesch-inspired nhưng tuned cho Vietnamese)
let score = 100 - (avgWordsPerSentence - 15) * 3;
// 15 từ/câu → score 100 (lý tưởng)
// 20 từ/câu → score 85
// 25 từ/câu → score 70
// 30 từ/câu → score 55

// Bonuses
if (hasBulletPoints) score += 5;
if (hasTables) score += 3;
if (hasShortParagraphs) score += 5;       // all paragraphs ≤ 80 từ

// Penalties
score -= longSentenceCount * 2;            // câu > 30 từ
score -= longParagraphCount * 3;           // đoạn > 100 từ

score = Math.max(0, Math.min(100, Math.round(score)));
```

### 9.6 Grade Mapping

| Score | Grade | Đối tượng |
|-------|-------|----------|
| 80-100 | Rất dễ đọc | Mọi người |
| 60-79 | Dễ đọc | Người đọc phổ thông |
| 40-59 | Trung bình | Cần tập trung |
| 20-39 | Khó đọc | Chuyên ngành |
| 0-19 | Rất khó đọc | Học thuật |

### 9.7 Consistency Rule

Frontend và Backend PHẢI dùng chung 1 function readability. Package thành shared lib:

```
packages/
  shared/
    src/
      readability.ts     ← cả FE và BE import từ đây
      seo-checks.ts      ← client-side checks cũng import từ đây
```

---

# PHẦN IX: TESTING STRATEGY

## 10. TESTING PLAN

### 10.1 Testing Pyramid

```
          ┌─────────┐
          │  E2E    │  5-10 tests (critical flows)
          │ Cypress │
         ┌┴─────────┴┐
         │Integration │  30-50 tests (API + DB)
         │  Jest      │
        ┌┴────────────┴┐
        │  Unit Tests   │  100+ tests (logic, utils)
        │  Jest/Vitest  │
        └───────────────┘
```

### 10.2 Unit Tests (Bắt buộc)

| Module | Test gì | Mock gì |
|--------|---------|---------|
| seo-checker/checkers/* | Mỗi checker với dữ liệu pass/warning/fail | Không mock |
| readability.service | Các edge cases tiếng Việt | Không mock |
| content-gap.service | Gap detection logic | AI response |
| html-generator.service | 3 template outputs | Article data |
| plan-limit.guard | Credit check, feature gate | User data |
| ai-retry.service | Retry logic, exponential backoff | AI API |
| article state transitions | Valid/invalid transitions | DB |
| score calculation | Weighted score với các weights | Checklist data |

### 10.3 Integration Tests (Bắt buộc)

| Flow | Test gì | Mock gì |
|------|---------|---------|
| step1-analyze | API → Queue → Job complete → DB updated | SerpAPI (fixture), Claude (fixture) |
| step2-outline | Precondition check → AI call → DB save | Claude (fixture) |
| step3-write | Multi-section write → assemble → save | Claude (fixture) |
| step4-seo-check | Run all 12 checks → score calculation | Không mock |
| export/wordpress | Connection test → publish → history save | WP REST API (mock server) |
| one-click-publish | Full pipeline → partial failure handling | SerpAPI, Claude, WP API (all mocked) |
| autosave | Save content → NOT change status | Không mock |
| plan enforcement | Starter blocked from Pro features | Không mock |
| rate limiting | 11th request → 429 | Redis (real, test container) |

### 10.4 E2E Tests (Critical flows only)

| Flow | Steps |
|------|-------|
| Full article lifecycle | Login → Create project → Create article → Step 1-4 → Export HTML → Verify checklist |
| WordPress publish | Login → Connect WP (mock) → Publish → Verify export history |
| Editor AI actions | Open article → Select text → Rewrite → Verify content updated |
| Plan upgrade gate | Starter user → Try content gap → See upgrade prompt |

### 10.5 Mock Strategy

| External Service | Mock Method | Fixture Location |
|-----------------|-------------|-----------------|
| Claude API | HTTP interceptor (nock/msw) | `test/fixtures/ai/step1-response.json` |
| SerpAPI | HTTP interceptor | `test/fixtures/serp/seo-la-gi.json` |
| WordPress REST API | Mock HTTP server (express mini server) | `test/fixtures/wordpress/` |
| Redis | Real Redis (testcontainers) | — |
| PostgreSQL | Real PostgreSQL (testcontainers) | Seeded via Prisma |

### 10.6 Release Criteria

| Gate | Requirement |
|------|------------|
| Unit tests | ≥ 90% pass, 0 critical fail |
| Integration tests | 100% pass |
| E2E tests | 100% pass |
| Coverage | ≥ 70% line coverage (backend), ≥ 50% (frontend) |
| No P0 bugs | 0 P0 open |
| Performance | All NFR targets met (see section 11) |
| Security | No high/critical vulnerability in `npm audit` |

---

# PHẦN X: NON-FUNCTIONAL REQUIREMENTS

## 11. NFR

### 11.1 Performance Targets

| Operation | Target Response Time | Timeout |
|-----------|---------------------|---------|
| API sync endpoints | < 500ms (p95) | 10s |
| Autosave | < 200ms | 3s |
| SEO check (step4) | < 1s | 5s |
| AI editor actions (rewrite/expand) | < 8s (p95) | 15s |
| AI suggest links | < 10s (p95) | 20s |
| step1-analyze (job) | < 30s | 120s |
| step2-outline (job) | < 20s | 120s |
| step3-write (job) | < 60s | 120s |
| export/wordpress (job) | < 15s | 60s |
| one-click-publish (job) | < 90s | 180s |
| SSE first event | < 2s after job start | — |
| Client-side SEO score update | < 300ms after debounce | — |

### 11.2 Concurrency

| Limit | Value |
|-------|-------|
| Max concurrent async jobs / user | 3 |
| Max concurrent one-click-publish / article | 1 (locked via Redis) |
| Max concurrent WP publish / connection | 2 |
| Max SSE connections / user | 5 |

### 11.3 Data Limits

| Field | Limit |
|-------|-------|
| Article contentDraft | 200,000 chars |
| Article contentFinal | 200,000 chars |
| AI input (editor actions) | 5,000 chars |
| AI input (reference content) | 20,000 chars |
| Article title | 200 chars |
| Meta description | 300 chars |
| Focus keyword | 200 chars |
| Article images | 20 per article |
| Export HTML output | 500,000 chars |

### 11.4 Autosave

| Setting | Value | Configurable? |
|---------|-------|--------------|
| Interval | 10 seconds | ENV: `AUTOSAVE_INTERVAL_MS=10000` |
| Debounce | Chỉ save khi content thay đổi | — |
| Max content size | 200,000 chars | — |
| Status change | KHÔNG đổi status | — |
| Conflict resolution | Last write wins (timestamp compare) | — |

### 11.5 Logging & Retention

| Log type | Level | Retention |
|----------|-------|-----------|
| Application logs (Pino) | info | 30 days |
| AI logs (DB) | all | 90 days |
| Export history (DB) | all | Permanent |
| Job logs (BullMQ) | all | 7 days (completed), 30 days (failed) |
| Error logs | error | 90 days |
| Analytics (PostHog) | all | Per PostHog plan |

### 11.6 Availability

| Target | Value |
|--------|-------|
| Uptime | 99.5% (monthly) |
| RTO (Recovery Time) | < 1 hour |
| RPO (Recovery Point) | < 1 hour (DB backup) |
| DB backup frequency | Daily (automated) |
| Zero-downtime deploy | Yes (rolling update via Dokploy) |

---

# PHẦN XI: SECURITY

## 12. SECURITY REQUIREMENTS

| Item | Implementation |
|------|---------------|
| AI Rate Limit | Redis sliding window, per-plan limits |
| Plan Credit Limit | DB counter + guard |
| Content Length Limit | Validation pipe on all inputs |
| WP Password | AES-256-GCM encrypt at rest, key in ENV |
| JWT | Access: 15min, Refresh: 7 days, HttpOnly cookie |
| Input Validation | class-validator on all DTOs, strict whitelist |
| SQL Injection | Prisma parameterized queries (no raw SQL) |
| XSS | Sanitize HTML output (DOMPurify), CSP headers |
| CORS | Whitelist: app domain only |
| Helmet | All HTTP security headers |
| Idempotency | Redis lock + idempotencyKey on publish endpoints |
| Secrets | All in ENV, never in code/logs |
| npm audit | 0 high/critical before release |

---

# PHẦN XII: AI ENGINE DETAILS

## 13. AI CONFIGURATION

### 13.1 Model Selection

| Task | Model | Lý do |
|------|-------|-------|
| step1 keyword analysis | claude-sonnet-4-5-20250929 | Cần phân tích sâu |
| step2 outline | claude-sonnet-4-5-20250929 | Cần creativity + structure |
| step3 content expand | claude-sonnet-4-5-20250929 | Cần quality writing |
| step3 paragraph write | claude-sonnet-4-5-20250929 | Cần quality writing |
| step SEO suggestions | claude-haiku-4-5-20251001 | Logic đơn giản, tiết kiệm |
| AI rewrite | claude-haiku-4-5-20251001 | Fast, cheap |
| AI expand | claude-haiku-4-5-20251001 | Fast, cheap |
| AI simplify | claude-haiku-4-5-20251001 | Fast, cheap |
| AI humanize | claude-haiku-4-5-20251001 | Fast, cheap |
| AI suggest links | claude-haiku-4-5-20251001 | Fast, cheap |
| Content gap analysis | claude-sonnet-4-5-20250929 | Cần phân tích semantic |
| Reverse link check | claude-haiku-4-5-20251001 | Binary decision, cheap |

### 13.2 Retry Config

```typescript
const AI_RETRY_CONFIG = {
  maxRetries: 3,
  backoff: 'exponential',       // 1s, 2s, 4s
  retryOn: [429, 500, 502, 503, 529],
  noRetryOn: [400, 401, 403],   // Client errors → fail ngay
};
```

### 13.3 Cost Estimation (Cập nhật v4)

| Task | Model | Input tokens | Output tokens | Cost/call |
|------|-------|-------------|--------------|-----------|
| step1 | Sonnet | ~2,000 | ~1,200 | $0.024 |
| step2 | Sonnet | ~2,500 | ~1,200 | $0.026 |
| step3a expand | Sonnet | ~1,500 | ~800 | $0.017 |
| step3b write ×5 | Sonnet | ~5,000 | ~5,000 | $0.090 |
| step4 SEO suggest | Haiku | ~2,000 | ~500 | $0.003 |
| HTML generate | Haiku | ~3,000 | ~2,000 | $0.005 |
| Editor action (avg) | Haiku | ~500 | ~500 | $0.001 |
| Suggest links | Haiku | ~2,000 | ~500 | $0.003 |
| Content gap | Sonnet | ~2,000 | ~800 | $0.018 |
| **Full article (no editor)** | | | | **~$0.19** |
| **+ 3 editor actions** | | | | **~$0.19** |
| **Total typical** | | | | **~$0.19** |

---

# PHẦN XIII: DEVOPS

## 14. DOCKER & DEPLOYMENT

### 14.1 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
      - NEXT_PUBLIC_POSTHOG_KEY=${POSTHOG_KEY}
    depends_on: [backend]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://seo:${DB_PASS}@postgres:5432/seo_aeo_db
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SERPAPI_KEY=${SERPAPI_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - WP_ENCRYPTION_KEY=${WP_ENCRYPTION_KEY}
      - POSTHOG_KEY=${POSTHOG_KEY}
      - AUTOSAVE_INTERVAL_MS=10000
      - LOG_LEVEL=info
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: seo
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: seo_aeo_db
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U seo -d seo_aeo_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redisdata:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  migration:
    build: ./backend
    command: npx prisma migrate deploy
    environment:
      - DATABASE_URL=postgresql://seo:${DB_PASS}@postgres:5432/seo_aeo_db
    depends_on:
      postgres: { condition: service_healthy }

volumes:
  pgdata:
  redisdata:
```

---

# PHẦN XIV: HANDOFF CHECKLIST

## 15. CHECKLIST TRƯỚC KHI CODE

| # | Item | Status |
|---|------|--------|
| 1 | Article State Machine defined | ✅ Section 2 |
| 2 | All API contracts (request/response/errors) | ✅ Section 3-4 |
| 3 | Sync vs Async classification | ✅ Section 3.3 |
| 4 | Async job protocol (SSE + poll) | ✅ Section 3.4 |
| 5 | Idempotency rules for publish | ✅ Section 5 |
| 6 | Partial failure rules for one-click | ✅ Section 5.3 |
| 7 | DB schema with indexes | ✅ Section 6 |
| 8 | Checklist weight source of truth | ✅ Section 7 |
| 9 | Plan enforcement rules | ✅ Section 8 |
| 10 | Readability spec for Vietnamese | ✅ Section 9 |
| 11 | Testing strategy + mocks | ✅ Section 10 |
| 12 | Non-functional requirements | ✅ Section 11 |
| 13 | Security requirements | ✅ Section 12 |
| 14 | AI model selection + retry config | ✅ Section 13 |
| 15 | Docker + deployment | ✅ Section 14 |

---

## 16. RECOMMENDED DEV ORDER

| Week | Backend | Frontend |
|------|---------|----------|
| 1-2 | Auth + Project + Article CRUD + DB migration + State machine | Next.js setup + Auth + Dashboard + Project pages |
| 3-4 | AI Engine core + BullMQ + SSE + Step 1 (Keyword + SERP) | TipTap editor setup + Step Navigator + Step 1 UI |
| 5-6 | Step 2 (Outline + Gap) + Step 3 (Content writer) | Step 2 UI (outline editor) + Step 3 UI (TipTap + AI actions) |
| 7 | SEO Checker (12 items) + Readability + Realtime score | SEO Checklist panel + Realtime score + SERP benchmark |
| 8-9 | Export module (HTML + WordPress) + Internal Link Engine | Export panel UI + WP connection UI + 1-Click UI |
| 10 | One-click publish + Plan enforcement + Rate limiting | Plan gates + Error handling + Polish |

**Shared tasks (ongoing):** Testing, CI/CD, monitoring, bug fixes.

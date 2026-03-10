# Phase 05 - Export & WordPress 1-Click Publish
> Weeks 8-9 | Priority: P0 | Status: Pending

## Context Links
- Previous phase: [phase-04-seo-checker.md](./phase-04-seo-checker.md)
- Next phase: [phase-06-publish-enforcement.md](./phase-06-publish-enforcement.md)

---

## Overview
Two deliverables: (A) HTML export with a clean, styled template and (B) the
WordPress integration using the WP REST API v2. WP credentials are stored
AES-256-GCM encrypted. The publish step is ASYNC (BullMQ job) because WP API
calls can take 5-90s on shared hosting. A Redis lock prevents duplicate publishes.

**State transition**: SEO_CHECKED -> EXPORTED (HTML) -> PUBLISHED (WP)
**Step 5 target**: < 2s for HTML export; 5-90s for WP publish (async)

---

## Key Insights
- AES-256-GCM: encrypt WP App Password, store cipher+iv+authTag in DB.
- Use WP Application Passwords (not user password) for API auth.
- WordPress REST API: POST /wp-json/wp/v2/posts - returns post ID + link.
- Redis lock (`NX EX 120`) prevents double-publish on retry.
- ExportHistory records every export/publish with status + wpPostId.
- Internal Link Engine: find candidate articles in same project by keyword overlap.

---

## Requirements
- [ ] HTML export template (Tailwind prose classes or inline CSS)
- [ ] POST /articles/:id/export-html returns { html, downloadUrl }
- [ ] WordPressConnection CRUD: POST/GET/DELETE /projects/:id/wp-connection
- [ ] AES-256-GCM encryption service for WP App Password
- [ ] POST /articles/:id/publish-wp (async BullMQ job)
- [ ] WordPressPublishProcessor with Redis idempotency lock
- [ ] ExportHistory row created for each export/publish
- [ ] InternalLinkEngine: suggest articles by keyword overlap
- [ ] Frontend: Export tab in editor, WP connection settings, 1-click button

---

## Architecture

### AES-256-GCM Encryption Service
```typescript
// apps/api/src/encryption/encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private cfg: ConfigService) {
    const keyHex = cfg.get<string>('ENCRYPTION_KEY'); // 64 hex chars = 32 bytes
    if (!keyHex || keyHex.length !== 64)
      throw new Error('ENCRYPTION_KEY must be 64 hex chars');
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): { cipher: string; iv: string; authTag: string } {
    const iv = randomBytes(12);
    const c = createCipheriv(this.algorithm, this.key, iv);
    const cipher = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
    return {
      cipher:  cipher.toString('base64'),
      iv:      iv.toString('base64'),
      authTag: c.getAuthTag().toString('base64'),
    };
  }

  decrypt(cipher: string, iv: string, authTag: string): string {
    const d = createDecipheriv(this.algorithm, this.key,
      Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([
      d.update(Buffer.from(cipher, 'base64')), d.final()
    ]).toString('utf8');
  }
}
```

### WordPress Publish Processor
```typescript
@Processor('ai-jobs')
export class WordPressPublishProcessor extends WorkerHost {
  async process(job: Job<WpPublishJobData>): Promise<WpPublishResult> {
    const { articleId, projectId } = job.data;
    const lockKey = `wp-publish:lock:${articleId}`;

    // Redis idempotency lock (NX = only set if not exists, EX = 120s TTL)
    const acquired = await this.redis.set(lockKey, job.id, 'NX', 'EX', 120);
    if (!acquired) {
      this.logger.warn(`Duplicate publish job for article ${articleId}`);
      return { skipped: true, reason: 'duplicate' };
    }

    try {
      const [article, wpConn] = await Promise.all([
        this.articlesService.findOneWithRelations(articleId),
        this.wpService.getConnection(projectId),
      ]);

      const password = this.encryption.decrypt(
        wpConn.encryptedPass, wpConn.iv, wpConn.authTag
      );

      const html = this.exportService.renderHtml(article);
      const wpPost = await this.wpService.createPost(wpConn.siteUrl, {
        title: article.title,
        content: html,
        status: 'publish',
        meta: { _yoast_wpseo_metadesc: article.metaDesc ?? '' },
      }, wpConn.username, password);

      await this.prisma.exportHistory.create({ data: {
        articleId, type: 'WORDPRESS', wpPostId: String(wpPost.id),
        wpPostUrl: wpPost.link, status: 'SUCCESS',
      }});

      await this.articlesService.transition(articleId, ArticleState.PUBLISHED);
      await this.emit(articleId, 'COMPLETED', 100, wpPost.link);
      return { wpPostId: wpPost.id, url: wpPost.link };
    } finally {
      await this.redis.del(lockKey); // Release lock
    }
  }
}
```

### WordPress REST API Service
```typescript
@Injectable()
export class WordPressService {
  async createPost(
    siteUrl: string,
    payload: WpPostPayload,
    username: string,
    password: string,
  ): Promise<WpPost> {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000), // 90s timeout
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadGatewayException(
        `WordPress API error ${res.status}: ${err.message ?? 'unknown'}`
      );
    }
    return res.json();
  }

  async testConnection(siteUrl: string, username: string, password: string): Promise<boolean> {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      headers: { 'Authorization': `Basic ${auth}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  }
}
```

### HTML Export Template
```typescript
// apps/api/src/export/export.service.ts
@Injectable()
export class ExportService {
  renderHtml(article: ArticleWithRelations): string {
    const keywords = article.keywords.map(k => k.keyword.term).join(', ');
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${escapeHtml(article.metaDesc ?? '')}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <title>${escapeHtml(article.title)}</title>
</head>
<body>
  <article>
    ${article.content ?? ''}
  </article>
</body>
</html>`;
  }

  renderWordPressContent(article: ArticleWithRelations): string {
    // WordPress strips <html>/<head> - return only body content
    return article.content ?? '';
  }
}
```

### Internal Link Engine
```typescript
// apps/api/src/internal-links/internal-link.service.ts
@Injectable()
export class InternalLinkService {
  /**
   * Suggest internal links from OTHER published articles in the same project.
   * Algorithm: keyword overlap score (Jaccard similarity on keyword sets).
   */
  async suggest(articleId: string, topN = 5): Promise<InternalLinkSuggestion[]> {
    const article = await this.articlesService.findOneWithRelations(articleId);
    const projectArticles = await this.prisma.article.findMany({
      where: {
        projectId: article.projectId,
        id: { not: articleId },
        state: { in: [ArticleState.SEO_CHECKED, ArticleState.EXPORTED, ArticleState.PUBLISHED] },
      },
      include: { keywords: { include: { keyword: true } } },
    });

    const targetKws = new Set(article.keywords.map(k => k.keyword.term.toLowerCase()));

    const scored = projectArticles.map(a => {
      const aKws = new Set(a.keywords.map(k => k.keyword.term.toLowerCase()));
      const intersection = [...targetKws].filter(k => aKws.has(k)).length;
      const union = new Set([...targetKws, ...aKws]).size;
      const jaccard = union === 0 ? 0 : intersection / union;
      return { article: a, score: jaccard };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(s => ({
        articleId: s.article.id,
        title: s.article.title,
        relevanceScore: Math.round(s.score * 100),
      }));
  }
}
```

### WordPressConnection CRUD
```typescript
// POST /projects/:id/wp-connection
@Post(':id/wp-connection')
@UseGuards(JwtAuthGuard)
async saveWpConnection(
  @Param('id') projectId: string,
  @GetUser() user: User,
  @Body() dto: WpConnectionDto,
): Promise<void> {
  await this.projectsService.assertOwnership(projectId, user.id);
  // Test connection first
  const ok = await this.wpService.testConnection(dto.siteUrl, dto.username, dto.appPassword);
  if (!ok) throw new BadRequestException('Cannot connect to WordPress site. Check URL and App Password.');

  const { cipher, iv, authTag } = this.encryption.encrypt(dto.appPassword);
  await this.prisma.wordPressConnection.upsert({
    where: { projectId },
    create: { projectId, siteUrl: dto.siteUrl, username: dto.username,
              encryptedPass: cipher, iv, authTag },
    update: { siteUrl: dto.siteUrl, username: dto.username,
              encryptedPass: cipher, iv, authTag },
  });
}
```

---

## Related Code Files
- `apps/api/src/encryption/encryption.service.ts`
- `apps/api/src/wordpress/wordpress.service.ts`
- `apps/api/src/export/export.service.ts`
- `apps/api/src/internal-links/internal-link.service.ts`
- `apps/api/src/articles/processors/wp-publish.processor.ts`
- `apps/web/components/editor/ExportTab.tsx`
- `apps/web/components/settings/WpConnectionForm.tsx`

---

## Implementation Steps

### Step 1 - Encryption Service (Day 1)
1. Generate ENCRYPTION_KEY: `openssl rand -hex 32` -> add to .env.
2. EncryptionService: encrypt() + decrypt() using Node.js crypto aes-256-gcm.
3. Unit test: encrypt -> decrypt roundtrip, tampered authTag throws error.

### Step 2 - WordPress Connection (Day 1-2)
1. WordPressService: createPost(), testConnection(), updatePost().
2. WordPressConnection CRUD endpoints under /projects/:id/wp-connection.
3. Test connection before saving credentials.
4. Frontend: WP connection settings form in project settings page.

### Step 3 - HTML Export (Day 2)
1. ExportService.renderHtml() with clean semantic HTML template.
2. POST /articles/:id/export-html: render + store in ExportHistory + transition.
3. Return presigned URL or base64 download for client.
4. Frontend: Download HTML button in Export tab.

### Step 4 - WP Publish Processor (Day 3-4)
1. WordPressPublishProcessor in ai-jobs queue.
2. Redis NX lock before publish (120s TTL).
3. Decrypt WP password, call WP REST API, store ExportHistory.
4. Transition to PUBLISHED; emit SSE COMPLETED with WP post URL.

### Step 5 - Internal Link Engine (Day 4-5)
1. InternalLinkService.suggest(): Jaccard similarity on keyword sets.
2. GET /articles/:id/internal-links returns top 5 suggestions.
3. Frontend: suggest links panel in editor sidebar.
4. Click suggestion -> insert anchor tag at cursor in TipTap.

### Step 6 - Frontend Export & Publish UI (Day 5)
1. Export tab: Download HTML button, 1-Click Publish button.
2. WP publish button triggers POST /articles/:id/publish-wp.
3. SSE stream shows publish progress (connecting, uploading, done).
4. On COMPLETED: show WP post URL with "View Post" button.

---

## Todo List

### Backend - Encryption
- [ ] EncryptionService (AES-256-GCM encrypt/decrypt)
- [ ] ENCRYPTION_KEY env var (64 hex chars)
- [ ] Unit tests (roundtrip + tampered tag error)

### Backend - WordPress
- [ ] WordPressService (createPost, testConnection)
- [ ] WpConnectionDto with class-validator
- [ ] POST/GET/DELETE /projects/:id/wp-connection
- [ ] Test connection validation before saving

### Backend - Export
- [ ] ExportService.renderHtml() template
- [ ] POST /articles/:id/export-html
- [ ] ExportHistory model + create on each export
- [ ] Article transition to EXPORTED

### Backend - WP Publish
- [ ] WordPressPublishProcessor (ai-jobs)
- [ ] Redis NX lock (prevent duplicate publish)
- [ ] Decrypt password + call WP REST API
- [ ] ExportHistory record with wpPostId + wpPostUrl
- [ ] Article transition to PUBLISHED
- [ ] POST /articles/:id/publish-wp endpoint

### Backend - Internal Links
- [ ] InternalLinkService.suggest() (Jaccard)
- [ ] GET /articles/:id/internal-links
- [ ] InternalLink model (optional: save accepted suggestions)

### Frontend
- [ ] Export tab component (HTML download + WP publish)
- [ ] WP connection settings form (in project settings)
- [ ] 1-click publish button with SSE progress
- [ ] Internal link suggestions panel
- [ ] Insert link at cursor action

---

## Success Criteria
- AES-256-GCM encrypt/decrypt roundtrip produces identical plaintext
- Tampered authTag throws authentication failed error
- POST /publish-wp enqueues job; SSE delivers COMPLETED with WP URL in < 90s
- Redis lock prevents duplicate WP posts on retry
- ExportHistory row created for every export/publish
- HTML export contains valid semantic HTML (validate with W3C)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WP App Password auth rejected | Medium | High | Test connection before saving creds; clear error message |
| WP shared hosting timeout (>90s) | Medium | Medium | BullMQ timeout 120s; retry once; mark FAILED with hint |
| AES key rotation | Low | High | Add key versioning field; re-encrypt on rotation |
| Internal link false positives | Low | Low | Show score; user accepts/rejects suggestion |

---

## Security Considerations
- ENCRYPTION_KEY never in code or git - only in .env / secrets manager
- encryptedPass, iv, authTag stored separately; reconstruction requires all 3
- WP credentials only decrypted in BullMQ worker, never returned to client
- Test connection endpoint validates URL format to prevent SSRF
- WP App Passwords have limited scope (only WP API, not login)

---

## Next Steps -> Phase 6
- One-click publish pipeline with partial failure handling
- Redis sliding window rate limiting (per plan)
- Article credit deduction (idempotent)
- Plan feature gates (project limit, article limit)

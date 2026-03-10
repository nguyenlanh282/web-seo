import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { AnthropicService } from '../ai/anthropic.service'
import { SeoService } from '../seo/seo.service'
import { ArticleStatus, ExportType, ExportStatus } from '@prisma/client'
import { QUEUE_NAMES, AI_MODELS, REDIS_KEYS } from '@seopen/shared'
import { assertTransition } from './state-machine'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { Step2Dto, Step3Dto } from './dto/step2.dto'
import { AIActionDto } from './dto/ai-action.dto'

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private anthropic: AnthropicService,
    private seoService: SeoService,
    @InjectQueue(QUEUE_NAMES.OUTLINE_GENERATION) private outlineQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CONTENT_WRITING) private contentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WORDPRESS_PUBLISH) private wpPublishQueue: Queue,
  ) {}

  async findAll(userId: string, projectId?: string) {
    return this.prisma.article.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      select: {
        id: true,
        title: true,
        targetKeyword: true,
        status: true,
        seoScore: true,
        readabilityScore: true,
        wordCount: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findOne(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        seoChecklist: true,
        jobLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
      },
    })
    if (!article) throw new NotFoundException('Article not found')
    if (article.userId !== userId) throw new ForbiddenException('Access denied')
    return article
  }

  async create(userId: string, dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        title: dto.title,
        targetKeyword: dto.targetKeyword,
        projectId: dto.projectId,
        userId,
        status: ArticleStatus.DRAFT,
      },
    })
  }

  async update(id: string, userId: string, dto: UpdateArticleDto) {
    // Prevent direct status modification via general update
    if ((dto as any).status !== undefined) {
      throw new BadRequestException('Cannot update status directly. Use /articles/:id/status endpoint.')
    }
    await this.findOne(id, userId)
    // Include userId in where to prevent TOCTOU race condition
    return this.prisma.article.update({
      where: { id, userId },
      data: dto,
    })
  }

  async updateStatus(id: string, userId: string, status: ArticleStatus) {
    // Enforce state machine
    const current = await this.findOne(id, userId)
    try {
      assertTransition(current.status as ArticleStatus, status as ArticleStatus)
    } catch (e) {
      throw new BadRequestException(e.message)
    }

    // Include userId in where to prevent TOCTOU race condition
    return this.prisma.article.update({
      where: { id, userId },
      data: { status },
    })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId)
    // Include userId in where to prevent TOCTOU race condition
    return this.prisma.article.delete({ where: { id, userId } })
  }


  // ========== Step 2: Outline Generation ==========

  async generateOutline(articleId: string, userId: string, dto: Step2Dto) {
    // Verify ownership and state
    const article = await this.findOne(articleId, userId)
    if (article.status !== ArticleStatus.KEYWORD_ANALYZED && article.status !== ArticleStatus.OUTLINED) {
      throw new BadRequestException('Article must be in KEYWORD_ANALYZED or OUTLINED state')
    }

    // Idempotency check
    const idempotencyKey = `outline:idempotency:${articleId}`
    const existingJobId = await this.redis.get(idempotencyKey)
    if (existingJobId) {
      return { jobId: existingJobId, cached: true }
    }

    // Enqueue outline generation job
    const job = await this.outlineQueue.add('generate', {
      articleId,
      userId,
      targetLength: dto.targetLength,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      timeout: 60000, // 1 minute timeout
    })

    const jobId = job.id!.toString()
    await this.redis.setex(idempotencyKey, 3600, jobId) // 1 hour TTL

    return { jobId }
  }

  // ========== Step 3: Content Writing ==========

  async writeContent(articleId: string, userId: string, dto: Step3Dto) {
    // Verify ownership and state
    const article = await this.findOne(articleId, userId)
    if (article.status !== ArticleStatus.OUTLINED && article.status !== ArticleStatus.CONTENT_WRITTEN) {
      throw new BadRequestException('Article must be in OUTLINED or CONTENT_WRITTEN state')
    }

    if (!article.outline) {
      throw new BadRequestException('No outline found. Run Step 2 first.')
    }

    // Idempotency check
    const idempotencyKey = `content:idempotency:${articleId}`
    const existingJobId = await this.redis.get(idempotencyKey)
    if (existingJobId) {
      return { jobId: existingJobId, cached: true }
    }

    // Enqueue content writing job
    const job = await this.contentQueue.add('write', {
      articleId,
      userId,
      sections: dto.sections,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      timeout: 180000, // 3 minutes timeout
    })

    const jobId = job.id!.toString()
    await this.redis.setex(idempotencyKey, 7200, jobId) // 2 hours TTL

    return { jobId }
  }

  // ========== AI Editor Actions (SYNC) ==========

  async aiAction(articleId: string, userId: string, dto: AIActionDto) {
    // Verify ownership
    await this.findOne(articleId, userId)

    // Rate limit: 10 actions per minute per user
    const rateLimitKey = `ai_action:rate_limit:${userId}`
    const allowed = await this.redis.checkRateLimit(rateLimitKey, 10, 60)
    if (!allowed) {
      throw new BadRequestException('Rate limit exceeded: 10 AI actions per minute')
    }

    // Execute AI action using Claude Haiku (fast) — capture usage for billing
    const { text: result, inputTokens, outputTokens, latencyMs, cost } = await this.anthropic.completeWithUsage(
      AI_MODELS.HAIKU,
      'Bạn là trợ lý viết nội dung SEO tiếng Việt chuyên nghiệp.',
      `${dto.action}: ${dto.selectedText}\n\nContext: ${dto.context || ''}`,
      1024,
    )

    // Log AI usage with token counts and cost
    await this.prisma.aILog.create({
      data: {
        userId,
        articleId,
        model: AI_MODELS.HAIKU,
        action: dto.action.toUpperCase() as any,
        inputTokens,
        outputTokens,
        latencyMs,
        cost,
      },
    })

    return { result }
  }

  // ========== Step 4: SEO Check ==========

  async runSeoCheck(articleId: string, userId: string) {
    const article = await this.findOne(articleId, userId)

    if (article.status !== ArticleStatus.CONTENT_WRITTEN && article.status !== ArticleStatus.SEO_CHECKED) {
      throw new BadRequestException('Article must be in CONTENT_WRITTEN or SEO_CHECKED state to run SEO check')
    }

    if (!article.content) {
      throw new BadRequestException('Article has no content. Run Step 3 first.')
    }

    return this.seoService.runFullCheck(articleId)
  }

  // ========== Step 5: Export HTML ==========

  async exportHtml(articleId: string, userId: string) {
    const article = await this.findOne(articleId, userId)

    if (article.status !== ArticleStatus.SEO_CHECKED && article.status !== ArticleStatus.EXPORTED) {
      throw new BadRequestException('Article must be in SEO_CHECKED or EXPORTED state to export')
    }

    if (!article.contentHtml && !article.content) {
      throw new BadRequestException('Article has no content to export')
    }

    // Build full HTML document
    const html = this.buildExportHtml(article)

    // Transition to EXPORTED + log ExportHistory
    await this.prisma.$transaction([
      this.prisma.article.update({
        where: { id: articleId },
        data: { status: ArticleStatus.EXPORTED },
      }),
      this.prisma.exportHistory.create({
        data: { articleId, type: ExportType.HTML, status: ExportStatus.SUCCESS },
      }),
    ])

    return {
      html,
      title: article.title,
      metaDescription: article.metaDescription,
      wordCount: article.wordCount,
      seoScore: article.seoScore,
    }
  }

  // ========== Step 5b: Async WordPress Publish ==========

  async publishToWordPress(articleId: string, userId: string, wpSiteId: string) {
    const article = await this.findOne(articleId, userId)

    if (
      article.status !== ArticleStatus.EXPORTED &&
      article.status !== ArticleStatus.SEO_CHECKED
    ) {
      throw new BadRequestException(
        'Article must be in EXPORTED or SEO_CHECKED state to publish to WordPress',
      )
    }

    // Guard against double-enqueue (lock exists = already publishing)
    const lockKey = REDIS_KEYS.PUBLISH_LOCK(articleId)
    const locked = await this.redis.get(lockKey)
    if (locked) {
      throw new ConflictException('A WordPress publish job is already in progress for this article')
    }

    const job = await this.wpPublishQueue.add(
      'publish',
      { articleId, userId, wpSiteId },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
        timeout: 120000, // 2 min hard timeout
      },
    )

    return { jobId: job.id!.toString() }
  }

  // ========== Retry Publish ==========

  async retryPublish(articleId: string, userId: string, wpSiteId?: string) {
    const article = await this.findOne(articleId, userId)

    // Allow retry from EXPORTED, SEO_CHECKED, or PUBLISHED (PARTIAL DB-sync failure)
    const allowed: ArticleStatus[] = [
      ArticleStatus.EXPORTED,
      ArticleStatus.SEO_CHECKED,
      ArticleStatus.PUBLISHED,
    ]
    if (!allowed.includes(article.status as ArticleStatus)) {
      throw new BadRequestException(
        'Article must be in EXPORTED, SEO_CHECKED, or PUBLISHED (partial) state to retry publish',
      )
    }

    // Guard against re-publishing an article that already has a live WP post
    // (only allow retry when article is PUBLISHED but DB sync is known partial)
    if (article.status === ArticleStatus.PUBLISHED && (article as any).wpPostId) {
      throw new ConflictException(
        `Article already published as WP post #${(article as any).wpPostId}. Delete that post first or create a new article.`,
      )
    }

    // Resolve site: explicit > last used > error
    const resolvedSiteId = wpSiteId || (article as any).wpSiteId
    if (!resolvedSiteId) {
      throw new BadRequestException(
        'No WordPress site specified and no previous site on record. Provide wpSiteId.',
      )
    }

    // Guard against duplicate in-flight job
    const lockKey = REDIS_KEYS.PUBLISH_LOCK(articleId)
    const locked = await this.redis.get(lockKey)
    if (locked) {
      throw new ConflictException('A WordPress publish job is already in progress for this article')
    }

    const job = await this.wpPublishQueue.add(
      'publish',
      { articleId, userId, wpSiteId: resolvedSiteId },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
        timeout: 120000,
      },
    )

    return { jobId: job.id!.toString(), retried: true }
  }

  /** Escape plain text for safe injection into HTML text nodes */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  /** Strip dangerous tags and attributes from HTML content */
  private sanitizeHtmlContent(html: string): string {
    return html
      // Remove dangerous block-level tags and their content
      .replace(/<(script|iframe|object|embed|form|applet)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|iframe|object|embed|form|applet)[^>]*\/?>/gi, '')
      // Remove meta/base redirects
      .replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
      .replace(/<base[^>]*>/gi, '')
      // Strip inline event handlers (quoted and unquoted)
      .replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '')
      .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
      // Strip javascript: and data: URIs in href/src/action
      .replace(/(href|src|action)\s*=\s*(['"])\s*(javascript|data|vbscript):[^'"]*\2/gi, '$1="#"')
      .replace(/(href|src|action)\s*=\s*(javascript|data|vbscript):[^\s>]*/gi, '$1="#"')
      // Strip style expressions
      .replace(/style\s*=\s*(['"])[^'"]*expression\s*\([^'"]*\1/gi, '')
  }

  private buildExportHtml(article: any): string {
    const rawContent = article.contentHtml || article.content || ''
    const content = this.sanitizeHtmlContent(rawContent)
    const title = this.escapeHtml(article.title || 'Untitled')
    const meta = this.escapeHtml(article.metaDescription || '')

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${meta}">
  <title>${title}</title>
</head>
<body>
  <article>
    <h1>${title}</h1>
    ${content}
  </article>
</body>
</html>`
  }
}

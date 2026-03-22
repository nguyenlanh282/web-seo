import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { SseService } from '../jobs/sse.service'
import { ArticleStatus, ExportType, ExportStatus } from '@prisma/client'
import { QUEUE_NAMES, REDIS_KEYS, MIN_SEO_SCORE_FOR_PUBLISH } from '@seopen/shared'
import { decrypt } from '../common/utils/crypto'
import { validateWpUrl } from '../common/utils/ssrf'
import { WpPublishJobData, WpPartialError } from './wp-publish-job.types'
import { sanitizeWpContent } from './wp-content-sanitizer'

// Lock TTL must exceed job timeout + processing buffer to prevent ghost re-enqueue
// Value is 150s (job timeout = 120s + 30s buffer) — set on the Redis key by the service.
const LOCK_TTL_SECONDS = 150 as const

@Processor(QUEUE_NAMES.WORDPRESS_PUBLISH)
export class WpPublishProcessor {
  private readonly logger = new Logger(WpPublishProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sseService: SseService,
  ) {}

  @Process('publish')
  async handlePublish(job: Job<WpPublishJobData>): Promise<{ wpPostId: number; wpPostUrl: string }> {
    const { articleId, userId, wpSiteId, lockToken } = job.data
    this.logger.log(`WP publish job started: article=${articleId} site=${wpSiteId}`)

    const lockKey = REDIS_KEYS.PUBLISH_LOCK(articleId)

    try {
      // 10% — load & validate
      this.sseService.emitProgress(articleId, userId, 10, 'Đang tải bài viết...')
      await job.progress(10)

      const [article, site] = await Promise.all([
        this.prisma.article.findUnique({ where: { id: articleId } }),
        this.prisma.wpSite.findUnique({ where: { id: wpSiteId } }),
      ])

      if (!article) throw new Error(`Article ${articleId} not found`)
      if (article.userId !== userId) throw new Error('Article access denied')
      if (!site) throw new Error(`WP site ${wpSiteId} not found`)
      if (site.userId !== userId) throw new Error('WP site access denied')

      // Re-validate SSRF at publish time — prevents DNS rebinding attacks
      validateWpUrl(site.url)

      if (!article.seoScore || article.seoScore < MIN_SEO_SCORE_FOR_PUBLISH) {
        throw new Error(
          `SEO score ${article.seoScore ?? 0} is below minimum ${MIN_SEO_SCORE_FOR_PUBLISH} required for publish`,
        )
      }

      // 30% — decrypt credentials
      this.sseService.emitProgress(articleId, userId, 30, 'Đang kết nối WordPress...')
      await job.progress(30)

      const [enc, iv, authTag] = site.passwordEnc.split(':')
      if (!enc || !iv || !authTag) throw new Error('Invalid WP credentials format. Please re-add this site.')

      let password: string
      try {
        password = decrypt(enc, iv, authTag)
      } catch {
        throw new Error('Failed to decrypt WP credentials. Please remove and re-add this WordPress site.')
      }

      // 50% — sanitize content
      this.sseService.emitProgress(articleId, userId, 50, 'Đang chuẩn bị nội dung...')
      await job.progress(50)

      const content = sanitizeWpContent(article.contentHtml || article.content || '')
      const slug = article.slug || article.targetKeyword.toLowerCase().replace(/\s+/g, '-')

      // 70% — POST to WordPress REST API
      this.sseService.emitProgress(articleId, userId, 70, 'Đang đăng bài lên WordPress...')
      await job.progress(70)

      const auth = Buffer.from(`${site.username}:${password}`).toString('base64')
      const response = await axios.post(
        `${site.url}/wp-json/wp/v2/posts`,
        {
          title: article.title,
          content,
          excerpt: article.metaDescription || '',
          status: 'draft',
          slug,
          meta: { _yoast_wpseo_metadesc: article.metaDescription || '' },
        },
        { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, timeout: 90000 },
      )

      const wpPostId: number = response.data.id
      const wpPostUrl: string = response.data.link

      // 90% — persist (WP post already live; DB failure = PARTIAL state)
      this.sseService.emitProgress(articleId, userId, 90, 'Đang lưu kết quả...')
      await job.progress(90)

      try {
        await this.prisma.$transaction([
          this.prisma.article.update({
            where: { id: articleId },
            data: { status: ArticleStatus.PUBLISHED, wpPostId, wpPostUrl, wpSiteId, publishedAt: new Date() },
          }),
          this.prisma.exportHistory.create({
            data: { articleId, type: ExportType.WORDPRESS, status: ExportStatus.SUCCESS, wpPostId: String(wpPostId), wpPostUrl },
          }),
        ])
      } catch (dbError: unknown) {
        const dbMsg = dbError instanceof Error ? dbError.message : 'DB sync failed'
        this.logger.error(`DB sync failed after WP publish (postId=${wpPostId}): ${dbMsg}`)
        await this.prisma.exportHistory.create({
          data: {
            articleId,
            type: ExportType.WORDPRESS,
            status: ExportStatus.PARTIAL,
            wpPostId: String(wpPostId),
            wpPostUrl,
            errorMsg: `WP post created (id=${wpPostId}) but DB sync failed: ${dbMsg.slice(0, 400)}`,
          },
        }).catch(() => undefined)
        throw new WpPartialError(`WP post created (id=${wpPostId}) but DB sync failed. Use retry-publish to sync.`)
      }

      await job.progress(100)
      this.sseService.emitCompleted(articleId, userId, { wpPostId, wpPostUrl })
      this.logger.log(`✅ WP publish completed: article=${articleId} postId=${wpPostId}`)
      return { wpPostId, wpPostUrl }

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`❌ WP publish failed: article=${articleId} — ${msg}`)

      if (!(error instanceof WpPartialError)) {
        await this.prisma.exportHistory.create({
          data: { articleId, type: ExportType.WORDPRESS, status: ExportStatus.FAILED, errorMsg: msg.slice(0, 500) },
        }).catch(() => undefined)
      }

      this.sseService.emitFailed(articleId, userId, msg)
      throw error

    } finally {
      await this.redis.releaseLock(lockKey, lockToken)
    }
  }
}

// Re-export job types so consumers import from one place
export type { WpPublishJobData } from './wp-publish-job.types'
export { LOCK_TTL_SECONDS }

import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AnthropicService } from '../../ai/anthropic.service'
import { SseService } from '../../jobs/sse.service'
import { RedisService } from '../../redis/redis.service'
import { ArticleStatus } from '@prisma/client'
import { QUEUE_NAMES, AI_MODELS } from '@seopen/shared'
import { OutlineData, OutlineSection } from '@seopen/shared'

@Processor(QUEUE_NAMES.CONTENT_WRITING)
export class ContentWriterProcessor {
  private readonly logger = new Logger(ContentWriterProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly sseService: SseService,
    private readonly redis: RedisService,
  ) {}

  @Process('write')
  async handleWriting(
    job: Job<{ articleId: string; userId: string; sections?: OutlineSection[] }>,
  ) {
    const { articleId, userId, sections: providedSections } = job.data
    this.logger.log(`Writing content for article ${articleId}`)

    try {
      // Load article with outline
      this.sseService.emitProgress(articleId, userId, 5, 'Đang tải dàn ý...')
      await job.progress(5)

      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
      })

      if (!article) {
        throw new Error(`Article ${articleId} not found`)
      }

      if (!article.outline) {
        throw new Error('No outline found. Run Step 2 first.')
      }

      const outline = providedSections || (article.outline as unknown as OutlineData)?.sections
      if (!outline || outline.length === 0) {
        throw new Error('Empty outline')
      }

      // Get only H2 sections (level 2)
      const h2Sections = outline.filter((s: any) => s.level === 2)
      if (h2Sections.length === 0) {
        throw new Error('No H2 sections found in outline')
      }

      this.sseService.emitProgress(articleId, userId, 10, `Bắt đầu viết ${h2Sections.length} sections...`)
      await job.progress(10)

      // Write H1
      let fullContent = `<h1>${article.title}</h1>\n\n`

      // Write each H2 section sequentially
      for (let i = 0; i < h2Sections.length; i++) {
        const section: OutlineSection = h2Sections[i]

        const pct = Math.round(10 + (i / h2Sections.length) * 80)
        this.sseService.emitProgress(articleId, userId, pct, `Đang viết: ${section.title}`)
        await job.progress(pct)

        // Build context from previous sections
        const context = fullContent.substring(
          Math.max(0, fullContent.length - 1000),
          fullContent.length
        )

        // Generate section content
        const sectionContent = await this.writeSection(article, section, context)

        // Append to full content
        fullContent += `\n${sectionContent}\n`

        // Stream partial content via SSE
        this.sseService.emit(articleId, userId, {
          jobId: articleId,
          type: 'PARTIAL_CONTENT',
          progress: pct,
          message: `Hoàn thành: ${section.title}`,
          data: { html: sectionContent, sectionId: section.id },
        })

        this.logger.log(`Completed section ${i + 1}/${h2Sections.length}: ${section.title}`)
      }

      this.sseService.emitProgress(articleId, userId, 95, 'Đang lưu bài viết...')
      await job.progress(95)

      // Save full content to DB
      const wordCount = this.countWords(fullContent)
      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          content: fullContent,
          contentHtml: fullContent,
          wordCount,
          status: ArticleStatus.CONTENT_WRITTEN,
        },
      })

      // Log AI usage
      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'CONTENT_WRITING',
        },
      })

      await job.progress(100)
      this.sseService.emitCompleted(articleId, userId, {
        content: fullContent,
        wordCount,
      })

      this.logger.log(`✅ Content writing completed for article ${articleId} (${wordCount} words)`)
      return { success: true, wordCount }

    } catch (error: any) {
      this.logger.error(`❌ Content writing failed for article ${articleId}: ${error.message}`)
      this.sseService.emitFailed(articleId, userId, error.message)

      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'CONTENT_WRITING',
        },
      })

      throw error
    }
  }

  private async writeSection(
    article: any,
    section: OutlineSection,
    previousContext: string,
  ): Promise<string> {
    const systemPrompt = `Bạn là chuyên gia viết nội dung SEO người Việt. Viết một section bài viết chi tiết bằng tiếng Việt với giọng văn chuyên nghiệp, tự nhiên và hấp dẫn. Sử dụng markdown-style HTML (h2, h3, p, ul, li). Không dùng emoji.`

    const childrenText = section.children && section.children.length > 0
      ? `\n\nPhần con (H3):\n${section.children.map((c: any) => `- ${c.title} (${c.wordCount} từ)`).join('\n')}`
      : ''

    const userPrompt = `Viết section cho bài viết với từ khóa: "${article.targetKeyword}"

Tiêu đề section: ${section.title}
Word count mục tiêu: ${section.wordCount} từ${childrenText}

Context từ các sections trước (để đảm bảo continuity):
${previousContext.substring(0, 500)}

Hãy viết section hoàn chỉnh với cấu trúc:
- <h2>${section.title}</h2>
- Nhiều đoạn <p> với nội dung chi tiết, ví dụ thực tế
- Bullet points <ul><li> nếu cần liệt kê
- ${section.children && section.children.length > 0 ? 'Các sub-section <h3> theo đề xuất ở trên' : ''}

Yêu cầu:
1. Viết bằng tiếng Việt chuẩn, tự nhiên như người thật
2. Word count khoảng ${section.wordCount} từ
3. Tối ưu cho từ khóa "${article.targetKeyword}" (tần suất tự nhiên 1-2%)
4. Không lặp lại nội dung đã có trong context
5. Đảm bảo flow mượt mà từ context sang section mới
6. Không thêm kết luận hay tóm tắt ở cuối section (để dành cho section cuối cùng)

Chỉ trả về HTML content, không giải thích.`

    const html = await this.anthropic.complete(
      AI_MODELS.SONNET,
      systemPrompt,
      userPrompt,
      4096,
    )

    return html.trim()
  }

  private countWords(html: string): number {
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, ' ')
    // Count Vietnamese words (split by whitespace)
    return text.trim().split(/\s+/).filter(Boolean).length
  }
}

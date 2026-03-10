import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AnthropicService } from '../../ai/anthropic.service'
import { SseService } from '../../jobs/sse.service'
import { ArticleStatus } from '@prisma/client'
import { QUEUE_NAMES, AI_MODELS } from '@seopen/shared'

@Processor(QUEUE_NAMES.OUTLINE_GENERATION)
export class OutlineGeneratorProcessor {
  private readonly logger = new Logger(OutlineGeneratorProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly sseService: SseService,
  ) {}

  @Process('generate')
  async handleGeneration(
    job: Job<{ articleId: string; userId: string; targetLength: number }>,
  ) {
    const { articleId, userId, targetLength } = job.data
    this.logger.log(`Generating outline for article ${articleId}`)

    try {
      // Step 1: Load article and keyword analysis (10%)
      this.sseService.emitProgress(articleId, userId, 10, 'Đang tải dữ liệu bài viết...')
      await job.progress(10)

      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        include: { articleKeywords: { include: { keyword: true } } },
      })

      if (!article) {
        throw new Error(`Article ${articleId} not found`)
      }

      // Get primary keyword analysis from Step 1
      const primaryKeyword = article.articleKeywords.find((k: any) => k.isPrimary)
      if (!primaryKeyword || !primaryKeyword.keyword.serpData) {
        throw new Error('No keyword analysis found. Run Step 1 first.')
      }

      const serpData = primaryKeyword.keyword.serpData as any
      const aiAnalysis = serpData.aiAnalysis || {}

      this.sseService.emitProgress(articleId, userId, 30, 'Đang tạo dàn ý với AI...')
      await job.progress(30)

      // Step 2: Generate outline using Claude Sonnet (60%)
      const outlinePrompt = `Bạn là chuyên gia SEO người Việt. Tạo dàn ý chi tiết cho bài viết với từ khóa "${article.targetKeyword}" và mục tiêu ${targetLength} từ.

Dữ liệu SERP:
- Từ khóa chính: ${article.targetKeyword}
- Đề xuất độ dài: ${aiAnalysis.recommendedWordCount || targetLength} từ
- Góc tiếp cận gợi ý: ${aiAnalysis.suggestedAngles?.join(', ') || 'N/A'}
- Chủ đề chính: ${aiAnalysis.keyTopics?.join(', ') || 'N/A'}
- Content gaps: ${aiAnalysis.contentGaps?.join(', ') || 'N/A'}

Hãy tạo dàn ý theo JSON format sau (viết bằng tiếng Việt):
{
  "sections": [
    {
      "id": "section-1",
      "level": 2,
      "title": "Tiêu đề H2",
      "wordCount": 200,
      "contentGap": false,
      "children": [
        {
          "id": "section-1-1",
          "level": 3,
          "title": "Tiêu đề H3",
          "wordCount": 100,
          "contentGap": false
        }
      ]
    }
  ],
  "contentGaps": ["gap1", "gap2"]
}

Yêu cầu:
1. Tối thiểu 5 sections H2
2. Mỗi H2 có 2-3 sections H3 con
3. Tổng wordCount khoảng ${targetLength} từ
4. Đánh dấu contentGap = true cho sections cover content gaps từ SERP
5. Tiêu đề sections viết bằng tiếng Việt, hấp dẫn, chuẩn SEO`

      this.sseService.emitProgress(articleId, userId, 50, 'Đang phân tích với AI...')
      await job.progress(50)

      const aiResponse = await this.anthropic.complete(
        AI_MODELS.SONNET,
        'Bạn là chuyên gia SEO người Việt. Tạo dàn ý chi tiết cho bài viết theo JSON format.',
        outlinePrompt,
        2048,
      )

      // Extract JSON from response
      const jsonMatch = aiResponse.match(/{[\s\S]*}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      let outlineData: any
      try {
        outlineData = JSON.parse(jsonMatch[0])
      } catch (e) {
        this.logger.warn('Failed to parse AI response, using empty outline')
        outlineData = { sections: [], contentGaps: [] }
      }

      this.sseService.emitProgress(articleId, userId, 80, 'Đang lưu dàn ý...')
      await job.progress(80)

      // Step 3: Save outline to DB
      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          outline: outlineData,
          status: ArticleStatus.OUTLINED,
        },
      })

      // Log AI usage
      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'OUTLINE_GENERATION',
        },
      })

      await job.progress(100)
      this.sseService.emitCompleted(articleId, userId, {
        outline: outlineData,
      })

      this.logger.log(`✅ Outline generation completed for article ${articleId}`)
      return { success: true, sections: outlineData.sections.length }

    } catch (error: any) {
      this.logger.error(`❌ Outline generation failed for article ${articleId}: ${error.message}`)
      this.sseService.emitFailed(articleId, userId, error.message)

      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'OUTLINE_GENERATION',
        },
      })

      throw error
    }
  }
}

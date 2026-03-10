import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AnthropicService } from '../ai/anthropic.service'
import { SerpService } from './serp.service'
import { SseService } from '../jobs/sse.service'
import { RedisService } from '../redis/redis.service'
import { QUEUE_NAMES, AI_MODELS } from '@seopen/shared'
import { ArticleStatus } from '@prisma/client'

@Processor(QUEUE_NAMES.KEYWORD_ANALYSIS)
export class KeywordAnalysisProcessor {
  private readonly logger = new Logger(KeywordAnalysisProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly serpService: SerpService,
    private readonly sseService: SseService,
    private readonly redis: RedisService,
  ) {}

  @Process('analyze')
  async handleAnalysis(job: Job<{ articleId: string; userId: string; keyword: string; targetLength: number }>) {
    const { articleId, userId, keyword, targetLength } = job.data
    this.logger.log(`Processing step1 for article ${articleId}, keyword: "${keyword}"`)

    try {
      // Step 1: Fetch SERP data (20%)
      this.sseService.emitProgress(articleId, userId, 10, 'Đang lấy dữ liệu SERP...')
      await job.progress(10)

      const serpData = await this.serpService.fetchSerpData(keyword)

      this.sseService.emitProgress(articleId, userId, 30, 'Đang phân tích đối thủ...')
      await job.progress(30)

      // Step 2: AI Content Gap Analysis (60%)
      const contentGapPrompt = `Phân tích SERP cho từ khóa "${keyword}" với mục tiêu viết bài ${targetLength} từ bằng tiếng Việt.

Dữ liệu SERP top 5:
${serpData.results.slice(0, 5).map((r, i) => `${i+1}. "${r.title}" - ${r.url}\nSnippet: ${r.snippet}`).join('\n\n')}

Người ta cũng hỏi:
${serpData.peopleAlsoAsk.slice(0, 5).join('\n')}

Hãy phân tích và trả về JSON với cấu trúc:
{
  "contentGaps": ["gap1", "gap2", "gap3"],
  "suggestedAngles": ["angle1", "angle2"],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "recommendedWordCount": number,
  "competitorStrengths": ["strength1", "strength2"],
  "searchIntent": "informational|transactional|navigational|commercial"
}`

      this.sseService.emitProgress(articleId, userId, 50, 'Đang phân tích với AI...')
      await job.progress(50)

      let aiAnalysis: any = {}
      try {
        const aiResponse = await this.anthropic.complete(
          AI_MODELS.SONNET,
          'Bạn là chuyên gia SEO người Việt. Phân tích SERP và trả về JSON hợp lệ, không có markdown.',
          contentGapPrompt,
          2048,
        )
        // Extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        this.logger.warn('AI analysis failed, using SERP data only')
      }

      this.sseService.emitProgress(articleId, userId, 80, 'Đang lưu kết quả...')
      await job.progress(80)

      // Save keyword to DB
      const keywordRecord = await this.prisma.keyword.upsert({
        where: { keyword },
        create: {
          keyword,
          serpData: {
            ...serpData,
            aiAnalysis,
          },
          cachedAt: new Date(),
        },
        update: {
          serpData: {
            ...serpData,
            aiAnalysis,
          },
          cachedAt: new Date(),
        },
      })

      // Link keyword to article
      await this.prisma.articleKeyword.upsert({
        where: { articleId_keywordId: { articleId, keywordId: keywordRecord.id } },
        create: { articleId, keywordId: keywordRecord.id, isPrimary: true },
        update: { isPrimary: true },
      })

      // Charge credit (idempotent - only if not already charged)
      const article = await this.prisma.article.findUnique({ where: { id: articleId } })
      if (article && !article.creditCharged) {
        await this.prisma.$transaction([
          this.prisma.article.update({
            where: { id: articleId },
            data: {
              status: ArticleStatus.KEYWORD_ANALYZED,
              creditCharged: true,
            },
          }),
          this.prisma.user.update({
            where: { id: userId },
            data: { articlesUsedMonth: { increment: 1 } },
          }),
        ])
      } else {
        // Just update status
        await this.prisma.article.update({
          where: { id: articleId },
          data: { status: ArticleStatus.KEYWORD_ANALYZED },
        })
      }

      // Log AI usage
      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'KEYWORD_ANALYSIS',
        },
      })

      await job.progress(100)
      this.sseService.emitCompleted(articleId, userId, {
        serpData,
        aiAnalysis,
        keyword,
      })

      this.logger.log(`✅ Step1 completed for article ${articleId}`)
      return { success: true, keyword, serpResults: serpData.results.length }

    } catch (error: any) {
      this.logger.error(`❌ Step1 failed for article ${articleId}: ${error.message}`)
      this.sseService.emitFailed(articleId, userId, error.message)

      // Log failure without token data (job failed before AI call or mid-call)
      await this.prisma.aILog.create({
        data: {
          userId,
          articleId,
          model: AI_MODELS.SONNET,
          action: 'KEYWORD_ANALYSIS',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          cost: 0,
        },
      })

      throw error
    }
  }
}

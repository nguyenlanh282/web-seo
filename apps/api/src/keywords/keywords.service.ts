import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { QUEUE_NAMES, REDIS_KEYS } from '@seopen/shared'
import { AnalyzeKeywordDto } from './dto/analyze-keyword.dto'

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_NAMES.KEYWORD_ANALYSIS) private readonly queue: Queue,
  ) {}

  async startAnalysis(articleId: string, userId: string, dto: AnalyzeKeywordDto) {
    // Idempotency: if article already has analysis running/completed, return existing jobId
    const idempotencyKey = REDIS_KEYS.JOB_IDEMPOTENCY(articleId, 'step1')
    const existingJobId = await this.redis.get(idempotencyKey)
    if (existingJobId) {
      this.logger.log(`Step1 already queued for article ${articleId}, returning existing jobId`)
      return { jobId: existingJobId, cached: true }
    }

    // Queue the job
    const job = await this.queue.add('analyze', {
      articleId,
      userId,
      keyword: dto.keyword,
      targetLength: dto.targetLength || 1500,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    })

    const jobId = job.id!.toString()

    // Set idempotency key (expires in 1 hour)
    await this.redis.setex(idempotencyKey, 3600, jobId)

    this.logger.log(`Queued step1 analysis job ${jobId} for article ${articleId}`)
    return { jobId }
  }
}

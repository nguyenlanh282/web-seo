import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUE_NAMES } from '@seopen/shared'

export type JobPayload = {
  articleId: string
  userId: string
  [key: string]: unknown
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @InjectQueue(QUEUE_NAMES.KEYWORD_ANALYSIS) private keywordQueue: Queue,
    @InjectQueue(QUEUE_NAMES.OUTLINE_GENERATION) private outlineQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CONTENT_WRITING) private contentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WORDPRESS_PUBLISH) private wpQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ONE_CLICK_PUBLISH) private publishQueue: Queue,
  ) {}

  async addKeywordAnalysis(payload: JobPayload) {
    const job = await this.keywordQueue.add('analyze', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    })
    this.logger.log(`Queued keyword analysis job ${job.id} for article ${payload.articleId}`)
    return { jobId: job.id?.toString() }
  }

  async addOutlineGeneration(payload: JobPayload) {
    const job = await this.outlineQueue.add('generate', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
    })
    return { jobId: job.id?.toString() }
  }

  async addContentWriting(payload: JobPayload) {
    const job = await this.contentQueue.add('write', payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      timeout: 120000, // 2min timeout
    })
    return { jobId: job.id?.toString() }
  }

  async addWordPressPublish(payload: JobPayload) {
    const job = await this.wpQueue.add('publish', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
    return { jobId: job.id?.toString() }
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queues: Record<string, Queue> = {
      [QUEUE_NAMES.KEYWORD_ANALYSIS]: this.keywordQueue,
      [QUEUE_NAMES.OUTLINE_GENERATION]: this.outlineQueue,
      [QUEUE_NAMES.CONTENT_WRITING]: this.contentQueue,
      [QUEUE_NAMES.WORDPRESS_PUBLISH]: this.wpQueue,
      [QUEUE_NAMES.ONE_CLICK_PUBLISH]: this.publishQueue,
    }
    const queue = queues[queueName]
    if (!queue) return null

    const job = await queue.getJob(jobId)
    if (!job) return null

    return {
      jobId,
      state: await job.getState(),
      progress: job.progress(),
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    }
  }
}

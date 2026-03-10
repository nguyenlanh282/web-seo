import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { KeywordsController } from './keywords.controller'
import { KeywordsService } from './keywords.service'
import { SerpService } from './serp.service'
import { KeywordAnalysisProcessor } from './keyword-analysis.processor'
import { QUEUE_NAMES } from '@seopen/shared'
import { AiModule } from '../ai/ai.module'
import { JobsModule } from '../jobs/jobs.module'
import { RedisModule } from '../redis/redis.module'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.KEYWORD_ANALYSIS }),
    AiModule,
    JobsModule,
    RedisModule,
  ],
  controllers: [KeywordsController],
  providers: [KeywordsService, SerpService, KeywordAnalysisProcessor, RateLimitGuard],
  exports: [KeywordsService],
})
export class KeywordsModule {}

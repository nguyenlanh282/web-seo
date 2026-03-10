import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JobsService } from './jobs.service'
import { JobsController } from './jobs.controller'
import { SseService } from './sse.service'
import { QUEUE_NAMES } from '@seopen/shared'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.KEYWORD_ANALYSIS },
      { name: QUEUE_NAMES.OUTLINE_GENERATION },
      { name: QUEUE_NAMES.CONTENT_WRITING },
      { name: QUEUE_NAMES.WORDPRESS_PUBLISH },
      { name: QUEUE_NAMES.ONE_CLICK_PUBLISH },
    ),
  ],
  providers: [JobsService, SseService],
  controllers: [JobsController],
  exports: [JobsService, SseService, BullModule],
})
export class JobsModule {}

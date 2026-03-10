import { Module } from '@nestjs/common'
import { WordpressService } from './wordpress.service'
import { WordpressController } from './wordpress.controller'
import { WpPublishProcessor } from './wp-publish.processor'
import { JobsModule } from '../jobs/jobs.module'
import { RedisModule } from '../redis/redis.module'
import { UsersModule } from '../users/users.module'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'
import { PlanGuard } from '../common/guards/plan.guard'

@Module({
  imports: [JobsModule, RedisModule, UsersModule],
  providers: [WordpressService, WpPublishProcessor, RateLimitGuard, PlanGuard],
  controllers: [WordpressController],
  exports: [WordpressService],
})
export class WordpressModule {}

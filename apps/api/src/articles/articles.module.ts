import { Module } from '@nestjs/common'
import { ArticlesService } from './articles.service'
import { ArticlesController } from './articles.controller'
import { InternalLinkService } from './internal-link.service'
import { JobsModule } from '../jobs/jobs.module'
import { RedisModule } from '../redis/redis.module'
import { AiModule } from '../ai/ai.module'
import { SeoModule } from '../seo/seo.module'
import { UsersModule } from '../users/users.module'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'
import { PlanGuard } from '../common/guards/plan.guard'

@Module({
  imports: [JobsModule, RedisModule, AiModule, SeoModule, UsersModule],
  providers: [ArticlesService, InternalLinkService, RateLimitGuard, PlanGuard],
  controllers: [ArticlesController],
  exports: [ArticlesService],
})
export class ArticlesModule {}

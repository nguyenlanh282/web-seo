import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProjectsModule } from './projects/projects.module'
import { ArticlesModule } from './articles/articles.module'
import { KeywordsModule } from './keywords/keywords.module'
import { SeoModule } from './seo/seo.module'
import { AiModule } from './ai/ai.module'
import { WordpressModule } from './wordpress/wordpress.module'
import { JobsModule } from './jobs/jobs.module'
import { RedisModule } from './redis/redis.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ArticlesModule,
    KeywordsModule,
    SeoModule,
    AiModule,
    WordpressModule,
    JobsModule,
  ],
})
export class AppModule {}

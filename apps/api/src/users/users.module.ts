import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { CreditService } from './credit.service'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [RedisModule],
  providers: [UsersService, CreditService],
  controllers: [UsersController],
  exports: [UsersService, CreditService],
})
export class UsersModule {}

import { Injectable, ForbiddenException, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { PLAN_LIMITS } from '@seopen/shared'
import { UserPlan } from '@prisma/client'

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name)

  /**
   * Lua script: atomically check and decrement credits.
   * Returns remaining credits, or -1 if exhausted.
   */
  private readonly LUA_DEDUCT = `
    local key = KEYS[1]
    local dbCredits = tonumber(ARGV[1])

    -- Prime from DB if not cached
    local credits = tonumber(redis.call('GET', key))
    if credits == nil then
      credits = dbCredits
      redis.call('SET', key, credits)
      redis.call('EXPIRE', key, 3600)
    end

    if credits <= 0 then return -1 end
    redis.call('DECRBY', key, 1)
    return credits - 1
  `

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Atomically deduct 1 article credit.
   * Uses Redis for speed + Lua for atomicity, then syncs to DB async.
   *
   * @returns remaining credits after deduction
   * @throws ForbiddenException if no credits left
   */
  async deductCredit(userId: string, plan: UserPlan): Promise<number> {
    const key = `credits:${userId}`

    // Get current DB credits as fallback
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { articlesUsedMonth: true },
    })

    const planLimits = PLAN_LIMITS[plan]
    const dbCreditsRemaining = planLimits.articlesPerMonth - (user?.articlesUsedMonth || 0)

    const remaining = await this.redis.eval(
      this.LUA_DEDUCT,
      1,
      key,
      String(Math.max(0, dbCreditsRemaining)),
    ) as number

    if (remaining < 0) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'CREDIT_EXHAUSTED',
          message: `Đã hết lượt tạo bài viết tháng này. Gói ${plan} cho phép ${planLimits.articlesPerMonth} bài/tháng.`,
          upgradeUrl: '/pricing',
          plan,
          limit: planLimits.articlesPerMonth,
        },
      })
    }

    // Sync to DB asynchronously (not blocking critical path)
    this.prisma.user.update({
      where: { id: userId },
      data: { articlesUsedMonth: { increment: 1 } },
    }).catch(err => this.logger.error(`Failed to sync credit to DB for user ${userId}`, err))

    this.logger.log(`Credit deducted for user ${userId}: ${remaining} remaining`)
    return remaining
  }

  /**
   * Get remaining credits for a user.
   */
  async getCredits(userId: string, plan: UserPlan): Promise<{ used: number; limit: number; remaining: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { articlesUsedMonth: true },
    })

    const planLimits = PLAN_LIMITS[plan]
    const used = user?.articlesUsedMonth || 0
    const limit = planLimits.articlesPerMonth
    const remaining = Math.max(0, limit - used)

    return { used, limit, remaining }
  }

  /**
   * Reset monthly credits for a single user.
   */
  async resetCreditsForUser(userId: string): Promise<void> {
    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          articlesUsedMonth: 0,
          monthResetAt: new Date(),
        },
      }),
      this.redis.del(`credits:${userId}`),
    ])
  }

  /**
   * Monthly cron: reset all users' article credits on the 1st of each month.
   * Idempotent: sets to 0 (not decrement), safe to run multiple times.
   */
  @Cron('0 0 1 * *', { name: 'monthly-credit-reset' })
  async resetAllCredits(): Promise<void> {
    this.logger.log('Starting monthly credit reset...')

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, plan: true },
    })

    let resetCount = 0
    const batchSize = 50

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.resetCreditsForUser(user.id)
            resetCount++
          } catch (err) {
            this.logger.error(`Failed to reset credits for user ${user.id}`, err)
          }
        }),
      )
    }

    this.logger.log(`Monthly credit reset complete: ${resetCount}/${users.length} users`)
  }
}

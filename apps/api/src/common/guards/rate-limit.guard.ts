import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RedisService } from '../../redis/redis.service'
import { RATE_LIMIT_KEY, RateLimitMeta } from '../decorators/rate-limit.decorator'
import { PLAN_LIMITS } from '@seopen/shared'
import { UserPlan } from '@prisma/client'

/**
 * Rate limit guard using Redis sorted set sliding window.
 *
 * Usage:
 * 1. @RateLimit({ limit: 10, window: 60 }) — fixed 10 req/60s
 * 2. @RateLimit({ limit: 10, window: 60, perPlan: true }) — multiplied by plan tier
 *
 * Without @RateLimit decorator, uses fallback: 60 req/60s
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<RateLimitMeta>(RATE_LIMIT_KEY, context.getHandler())

    // Default limits if no decorator applied
    const limit = meta?.limit ?? 60
    const window = meta?.window ?? 60

    const request = context.switchToHttp().getRequest()
    const user = request.user
    const userId = user?.id ?? request.ip ?? 'anonymous'

    // Per-plan multiplier
    let effectiveLimit = limit
    if (meta?.perPlan && user?.plan) {
      const plan = user.plan as UserPlan
      const planLimits = PLAN_LIMITS[plan]
      // Scale limit based on plan's aiReqPerMin
      effectiveLimit = planLimits.aiReqPerMin
    }

    // Scope: handler name or custom scope
    const scope = meta?.scope ?? context.getHandler().name
    const key = `rl:${scope}:${userId}`

    const allowed = await this.redis.checkRateLimit(key, effectiveLimit, window)

    if (!allowed) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Quá giới hạn: ${effectiveLimit} lượt/${window}s. Vui lòng thử lại sau.`,
            retryAfter: window,
            limit: effectiveLimit,
            window,
            scope,  // include scope so frontend can distinguish simultaneous rate-limits
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }
}

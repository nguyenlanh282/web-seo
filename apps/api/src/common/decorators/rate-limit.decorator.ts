import { SetMetadata, applyDecorators } from '@nestjs/common'

export const RATE_LIMIT_KEY = 'rate_limit_meta'

export interface RateLimitMeta {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  window: number
  /** If true, limit is per plan tier (uses RATE_LIMITS from shared) */
  perPlan?: boolean
  /** Identifier for this limiter (defaults to handler name) */
  scope?: string
}

/**
 * Apply rate limiting to an endpoint.
 *
 * @example
 * // Fixed limit: 10 requests per 60 seconds
 * @RateLimit({ limit: 10, window: 60 })
 *
 * // Per-plan tier limits (reads from user.plan)
 * @RateLimit({ limit: 10, window: 60, perPlan: true })
 */
export const RateLimit = (meta: RateLimitMeta) =>
  applyDecorators(SetMetadata(RATE_LIMIT_KEY, meta))

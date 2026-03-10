import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)

  constructor() {
    super({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  }

  async onModuleInit() {
    try {
      await this.ping()
      this.logger.log('✅ Redis connected')
    } catch (error) {
      this.logger.error('❌ Redis connection failed', error)
    }
  }

  async onModuleDestroy() {
    await this.quit()
  }

  // Sliding window rate limit (Lua atomic)
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    const luaScript = `
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[2])
      redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
      redis.call('EXPIRE', KEYS[1], ARGV[4])
      return redis.call('ZCARD', KEYS[1]) <= tonumber(ARGV[3]) and 1 or 0
    `
    const result = await this.eval(luaScript, 1, key, now, windowStart, limit, windowSeconds)
    return result === 1
  }

  // AI quota check and increment (per day)
  async checkAndIncrementAIQuota(userId: string, dailyLimit: number): Promise<boolean> {
    const date = new Date().toISOString().split('T')[0]
    const key = `ai_quota:${userId}:${date}`
    const current = await this.incr(key)
    if (current === 1) {
      await this.expire(key, 86400) // 24 hours
    }
    return current <= dailyLimit
  }

  // Set idempotency key with TTL
  async setIdempotencyKey(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.set(key, value, 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  // Acquire distributed lock
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.set(key, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(key)
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: [
        // Query logging only in development — avoid leaking SQL/PII to stdout in prod
        ...(process.env.NODE_ENV !== 'production'
          ? [{ emit: 'stdout' as const, level: 'query' as const }]
          : []),
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    })
  }

  async onModuleInit() {
    try {
      await this.$connect()
      this.logger.log('Database connected')
    } catch (error) {
      this.logger.error('Database connection failed', error)
      throw error
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}

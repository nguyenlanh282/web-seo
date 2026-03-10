import { Controller, Get, Param, Post, Query, Sse, MessageEvent, UseGuards } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JobsService } from './jobs.service'
import { SseService } from './sse.service'

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly sseService: SseService,
  ) {}

  @Get(':queue/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getJobStatus(
    @Param('queue') queue: string,
    @Param('jobId') jobId: string,
  ) {
    const data = await this.jobsService.getJobStatus(queue, jobId)
    return { success: true, data }
  }

  @Post('sse-ticket')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async issueTicket(@CurrentUser() user: { id: string }) {
    const ticket = await this.sseService.createTicket(user.id)
    return { ticket }
  }

  // Authentication via one-time ticket query param — no JwtAuthGuard here
  @Sse('stream/:articleId')
  async streamJobProgress(
    @Query('ticket') ticket: string,
    @Param('articleId') articleId: string,
  ): Promise<Observable<MessageEvent>> {
    const userId = await this.sseService.validateTicket(ticket)
    return this.sseService.getStream(articleId, userId)
  }
}

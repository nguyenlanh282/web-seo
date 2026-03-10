import { Controller, Get, Param, Sse, MessageEvent, UseGuards } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JobsService } from './jobs.service'
import { SseService } from './sse.service'

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly sseService: SseService,
  ) {}

  @Get(':queue/:jobId')
  async getJobStatus(
    @Param('queue') queue: string,
    @Param('jobId') jobId: string,
  ) {
    const data = await this.jobsService.getJobStatus(queue, jobId)
    return { success: true, data }
  }

  @Sse('stream/:articleId')
  streamJobProgress(
    @CurrentUser() user: { id: string },
    @Param('articleId') articleId: string,
  ): Observable<MessageEvent> {
    return this.sseService.getStream(articleId, user.id)
  }
}

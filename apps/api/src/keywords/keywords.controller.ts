import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'
import { RateLimit } from '../common/decorators/rate-limit.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { KeywordsService } from './keywords.service'
import { AnalyzeKeywordDto } from './dto/analyze-keyword.dto'

@ApiTags('keywords')
@Controller('articles/:articleId/step1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Start keyword analysis (Step 1)' })
  @RateLimit({ limit: 10, window: 3600, perPlan: true, scope: 'step1' })
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  async startAnalysis(
    @CurrentUser() user: { id: string },
    @Param('articleId') articleId: string,
    @Body() dto: AnalyzeKeywordDto,
  ) {
    const data = await this.keywordsService.startAnalysis(articleId, user.id, dto)
    return { success: true, data }
  }
}

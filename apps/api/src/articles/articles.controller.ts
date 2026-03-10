import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ArticlesService } from './articles.service'
import { InternalLinkService } from './internal-link.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { Step2Dto, Step3Dto } from './dto/step2.dto'
import { AIActionDto } from './dto/ai-action.dto'
import { ArticleStatus } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'
import { PlanGuard } from '../common/guards/plan.guard'
import { RateLimit } from '../common/decorators/rate-limit.decorator'
import { PlanCheck } from '../common/decorators/plan-check.decorator'

class PublishWpDto {
  @IsString()
  @IsNotEmpty()
  wpSiteId: string
}

class RetryPublishDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  wpSiteId?: string
}

@ApiTags('articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(
    private articlesService: ArticlesService,
    private internalLinkService: InternalLinkService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all articles' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Request() req: any, @Query('projectId') projectId?: string) {
    return this.articlesService.findAll(req.user.id, projectId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an article by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.findOne(id, req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new article' })
  @PlanCheck('article')
  @UseGuards(PlanGuard)
  create(@Request() req: any, @Body() dto: CreateArticleDto) {
    return this.articlesService.create(req.user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an article' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, req.user.id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an article' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.remove(id, req.user.id)
  }

  // Step 1: Keyword Analysis — handled by keywords controller

  // Step 2: Generate Outline
  @Post(':id/step2')
  @ApiOperation({ summary: 'Generate article outline (Step 2)' })
  @RateLimit({ limit: 10, window: 3600, perPlan: true, scope: 'step2' })
  @UseGuards(RateLimitGuard)
  generateOutline(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Step2Dto,
  ) {
    return this.articlesService.generateOutline(id, req.user.id, dto)
  }

  // Step 3: Write Content
  @Post(':id/step3')
  @ApiOperation({ summary: 'Write full article content (Step 3)' })
  @RateLimit({ limit: 5, window: 3600, perPlan: true, scope: 'step3' })
  @UseGuards(RateLimitGuard)
  writeContent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Step3Dto,
  ) {
    return this.articlesService.writeContent(id, req.user.id, dto)
  }

  // Step 4: SEO Check
  @Post(':id/step4')
  @ApiOperation({ summary: 'Run SEO check and score article (Step 4)' })
  @RateLimit({ limit: 20, window: 3600, scope: 'step4' })
  @UseGuards(RateLimitGuard)
  runSeoCheck(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.articlesService.runSeoCheck(id, req.user.id)
  }

  // Step 5: Export HTML
  @Post(':id/step5/export')
  @ApiOperation({ summary: 'Export article as HTML (Step 5)' })
  exportHtml(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.articlesService.exportHtml(id, req.user.id)
  }

  // AI Editor Actions (SYNC)
  @Post(':id/ai-action')
  @ApiOperation({ summary: 'AI editor action: rewrite/expand/simplify/humanize' })
  @RateLimit({ limit: 10, window: 60, perPlan: true, scope: 'ai-action' })
  @UseGuards(RateLimitGuard)
  aiAction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AIActionDto,
  ) {
    return this.articlesService.aiAction(id, req.user.id, dto)
  }

  // State transitions
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update article status (enforced state machine)' })
  updateStatus(
    @Param('id') id: string,
    @Request() req: any,
    @Body('status') status: ArticleStatus,
  ) {
    return this.articlesService.updateStatus(id, req.user.id, status)
  }

  // Retry publish for PARTIAL/FAILED exports
  @Post(':id/retry-publish')
  @ApiOperation({ summary: 'Re-enqueue WP publish job (use after PARTIAL/DB-sync failure)' })
  @RateLimit({ limit: 5, window: 3600, scope: 'retry-publish' })
  @UseGuards(RateLimitGuard)
  retryPublish(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RetryPublishDto,
  ) {
    return this.articlesService.retryPublish(id, req.user.id, dto.wpSiteId)
  }

  // Step 5b: Async WordPress Publish
  @Post(':id/publish-wp')
  @ApiOperation({ summary: 'Async publish article to WordPress via BullMQ (Step 5b)' })
  @RateLimit({ limit: 3, window: 3600, scope: 'publish-wp' })
  @UseGuards(RateLimitGuard)
  publishToWordPress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PublishWpDto,
  ) {
    return this.articlesService.publishToWordPress(id, req.user.id, dto.wpSiteId)
  }

  // Internal Link Suggestions
  @Get(':id/internal-links')
  @ApiOperation({ summary: 'Get internal link suggestions for article' })
  internalLinks(@Param('id') id: string, @Request() req: any) {
    return this.internalLinkService.suggest(id, req.user.id)
  }
}

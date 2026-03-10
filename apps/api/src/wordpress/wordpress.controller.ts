import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { WordpressService } from './wordpress.service'
import { CreateWpSiteDto } from './dto/create-wp-site.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RateLimitGuard } from '../common/guards/rate-limit.guard'
import { PlanGuard } from '../common/guards/plan.guard'
import { RateLimit } from '../common/decorators/rate-limit.decorator'
import { PlanCheck } from '../common/decorators/plan-check.decorator'
import { IsString } from 'class-validator'

class PublishDto {
  @IsString()
  wpSiteId: string
}

@ApiTags('wordpress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wordpress')
export class WordpressController {
  constructor(private wpService: WordpressService) {}

  @Get('sites')
  @ApiOperation({ summary: 'List all WP sites' })
  getSites(@Request() req: any) {
    return this.wpService.findAllSites(req.user.id)
  }

  @Post('sites')
  @ApiOperation({ summary: 'Add a WP site' })
  @PlanCheck('wp_site')
  @UseGuards(JwtAuthGuard, PlanGuard)
  addSite(@Request() req: any, @Body() dto: CreateWpSiteDto) {
    return this.wpService.addSite(req.user.id, dto)
  }

  @Delete('sites/:id')
  @ApiOperation({ summary: 'Remove a WP site' })
  removeSite(@Param('id') id: string, @Request() req: any) {
    return this.wpService.removeSite(id, req.user.id)
  }

  @Post('publish/:articleId')
  @ApiOperation({ summary: 'Publish article to WordPress' })
  @RateLimit({ limit: 5, window: 3600, perPlan: true, scope: 'wp-publish' })
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  publish(@Param('articleId') articleId: string, @Request() req: any, @Body() dto: PublishDto) {
    return this.wpService.publishArticle(articleId, dto.wpSiteId, req.user.id)
  }
}

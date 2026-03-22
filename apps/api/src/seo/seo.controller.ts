import { Controller, Post, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SeoService } from './seo.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('seo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seo')
export class SeoController {
  constructor(private seoService: SeoService) {}

  @Post('check/:articleId')
  @ApiOperation({ summary: 'Run full SEO check for an article' })
  runCheck(@Param('articleId') articleId: string) {
    return this.seoService.runFullCheck(articleId)
  }
}

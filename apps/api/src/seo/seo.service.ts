import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ChecklistType } from '@prisma/client'

// ── Check modules ────────────────────────────────────────────────────────────
import { checkHeadlineKeyword, checkMetaDescription } from './seo-title-meta-checks'
import { checkHeadingStructure, checkTags } from './seo-heading-tag-checks'
import { checkImageAlt, checkImageFilename } from './seo-media-checks'
import { checkLinks, checkAnchorText } from './seo-link-checks'
import { checkKeywordCoverage } from './seo-keyword-coverage-check'
import { checkContentLength, checkReadability } from './seo-readability-length-checks'
import { checkContentGapCoverage } from './seo-content-gap-check'

export interface SeoCheckResult {
  type: ChecklistType
  passed: boolean
  score: number
  maxScore: number
  details: Record<string, unknown>
  suggestions: string[]
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name)

  constructor(private prisma: PrismaService) {}

  async runFullCheck(articleId: string): Promise<{ seoScore: number; checks: SeoCheckResult[] }> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        images: true,
        sourceLinks: true,
        articleKeywords: { include: { keyword: true } },
      },
    })
    if (!article) throw new Error('Article not found')

    const content = article.content || ''
    const contentHtml = article.contentHtml || content
    const keyword = article.targetKeyword

    const checks: SeoCheckResult[] = [
      checkHeadlineKeyword(article.title, keyword),
      checkMetaDescription(article.metaDescription, keyword),
      checkHeadingStructure(contentHtml, keyword),
      checkImageAlt(article.images, keyword),
      checkImageFilename(article.images, keyword),
      checkKeywordCoverage(content, keyword, article.wordCount || 0),
      checkTags(article.articleKeywords),
      checkLinks(contentHtml, article.sourceLinks),
      checkAnchorText(contentHtml, keyword),
      checkContentLength(article.wordCount || 0),
      checkReadability(content),
      checkContentGapCoverage(content, keyword, article.articleKeywords),
    ]

    let earned = 0
    let totalPossible = 0

    for (const check of checks) {
      await this.prisma.seoChecklist.upsert({
        where: { articleId_type: { articleId, type: check.type } },
        create: { articleId, type: check.type, passed: check.passed, score: check.score, maxScore: check.maxScore, details: check.details, suggestions: check.suggestions },
        update: { passed: check.passed, score: check.score, maxScore: check.maxScore, details: check.details, suggestions: check.suggestions },
      })
      earned += check.score
      totalPossible += check.maxScore
    }

    const seoScore = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0

    await this.prisma.article.update({
      where: { id: articleId },
      data: { seoScore, status: 'SEO_CHECKED' },
    })

    this.logger.log(`SEO check complete for article ${articleId}: score=${seoScore}`)
    return { seoScore, checks }
  }
}

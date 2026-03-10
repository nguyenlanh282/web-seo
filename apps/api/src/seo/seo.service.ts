import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ChecklistType } from '@prisma/client'
import { calculateReadability, SEO_WEIGHTS } from '@seopen/shared'

export interface SeoCheckResult {
  type: ChecklistType
  passed: boolean
  score: number
  maxScore: number
  details: Record<string, any>
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
      // 1. Headline keyword check
      this.checkHeadlineKeyword(article.title, keyword),

      // 2. Meta description check
      this.checkMetaDescription(article.metaDescription, keyword),

      // 3. Heading structure check
      this.checkHeadingStructure(contentHtml, keyword),

      // 4. Image alt text check
      this.checkImageAlt(article.images, keyword),

      // 5. Image filename check
      this.checkImageFilename(article.images, keyword),

      // 6. Keyword coverage check
      this.checkKeywordCoverage(content, keyword, article.wordCount || 0),

      // 7. Tags check
      this.checkTags(article.articleKeywords),

      // 8. Internal & external links check
      this.checkLinks(contentHtml, article.sourceLinks),

      // 9. Anchor text check
      this.checkAnchorText(contentHtml, keyword),

      // 10. Content length check
      this.checkContentLength(article.wordCount || 0),

      // 11. Readability check
      this.checkReadability(content),

      // 12. Content gap coverage check
      this.checkContentGapCoverage(content, keyword, article.articleKeywords),
    ]

    // Save to database and calculate score
    let earned = 0
    let totalPossible = 0

    for (const check of checks) {
      await this.prisma.seoChecklist.upsert({
        where: { articleId_type: { articleId, type: check.type } },
        create: {
          articleId,
          type: check.type,
          passed: check.passed,
          score: check.score,
          maxScore: check.maxScore,
          details: check.details,
          suggestions: check.suggestions,
        },
        update: {
          passed: check.passed,
          score: check.score,
          maxScore: check.maxScore,
          details: check.details,
          suggestions: check.suggestions,
        },
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

  // ============================================================================
  // 1. HEADLINE_KEYWORD — Từ khoá chính có trong tiêu đề
  // ============================================================================
  private checkHeadlineKeyword(title: string | null, keyword: string): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.HEADLINE_KEYWORD]
    if (!title) {
      return {
        type: ChecklistType.HEADLINE_KEYWORD,
        passed: false,
        score: 0,
        maxScore,
        details: {},
        suggestions: ['Thêm tiêu đề cho bài viết'],
      }
    }

    const titleLower = title.toLowerCase()
    const keywordLower = keyword.toLowerCase()
    const found = titleLower.includes(keywordLower)

    // Bonus: keyword ở đầu tiêu đề
    const atStart = titleLower.startsWith(keywordLower) || titleLower.indexOf(keywordLower) < 10
    const score = found ? (atStart ? maxScore : Math.round(maxScore * 0.8)) : 0

    return {
      type: ChecklistType.HEADLINE_KEYWORD,
      passed: found,
      score,
      maxScore,
      details: { title, keyword, found, atStart },
      suggestions: [
        ...(!found ? [`Thêm từ khoá "${keyword}" vào tiêu đề bài viết`] : []),
        ...(found && !atStart ? [`Đặt từ khoá "${keyword}" ở đầu tiêu đề để tối ưu hơn`] : []),
      ],
    }
  }

  // ============================================================================
  // 2. META_DESCRIPTION — Meta description tối ưu
  // ============================================================================
  private checkMetaDescription(meta: string | null, keyword: string): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.META_DESCRIPTION]

    if (!meta) {
      return {
        type: ChecklistType.META_DESCRIPTION,
        passed: false,
        score: 0,
        maxScore,
        details: { length: 0 },
        suggestions: ['Viết meta description (120-160 ký tự, chứa từ khoá chính)'],
      }
    }

    const len = meta.length
    const hasKeyword = meta.toLowerCase().includes(keyword.toLowerCase())
    const goodLength = len >= 120 && len <= 160
    const passed = hasKeyword && goodLength

    let score = 0
    if (passed) score = maxScore
    else if (hasKeyword) score = Math.round(maxScore * 0.6)
    else if (goodLength) score = Math.round(maxScore * 0.4)
    else score = Math.round(maxScore * 0.2)

    return {
      type: ChecklistType.META_DESCRIPTION,
      passed,
      score,
      maxScore,
      details: { length: len, hasKeyword, goodLength },
      suggestions: [
        ...(!hasKeyword ? [`Thêm từ khoá "${keyword}" vào meta description`] : []),
        ...(len < 120 ? ['Meta description quá ngắn (cần tối thiểu 120 ký tự)'] : []),
        ...(len > 160 ? ['Meta description quá dài (tối đa 160 ký tự)'] : []),
      ],
    }
  }

  // ============================================================================
  // 3. HEADING_STRUCTURE — Cấu trúc heading H2/H3/H4
  // ============================================================================
  private checkHeadingStructure(contentHtml: string, keyword: string): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.HEADING_STRUCTURE]

    // Extract headings from HTML
    const headingRegex = /<(h[2-6])[^>]*>(.*?)<\/\1>/gi
    const headings: { tag: string; text: string }[] = []
    let match: RegExpExecArray | null

    while ((match = headingRegex.exec(contentHtml)) !== null) {
      headings.push({ tag: match[1].toLowerCase(), text: match[2].replace(/<[^>]+>/g, '') })
    }

    // Also check markdown-style headings
    const mdHeadingRegex = /^(#{2,6})\s+(.+)$/gm
    while ((match = mdHeadingRegex.exec(contentHtml)) !== null) {
      const level = match[1].length
      headings.push({ tag: `h${level}`, text: match[2].trim() })
    }

    const h2Count = headings.filter(h => h.tag === 'h2').length
    const h3Count = headings.filter(h => h.tag === 'h3').length
    const totalHeadings = headings.length

    // Check if keyword appears in any heading
    const keywordInHeading = headings.some(h =>
      h.text.toLowerCase().includes(keyword.toLowerCase())
    )

    // Evaluate structure
    const hasH2 = h2Count >= 2
    const hasHierarchy = h2Count > 0 && h3Count > 0
    const goodDensity = totalHeadings >= 3 && totalHeadings <= 15
    const passed = hasH2 && hasHierarchy && keywordInHeading

    let score = 0
    if (passed && goodDensity) score = maxScore
    else if (passed) score = Math.round(maxScore * 0.8)
    else {
      if (hasH2) score += Math.round(maxScore * 0.3)
      if (hasHierarchy) score += Math.round(maxScore * 0.2)
      if (keywordInHeading) score += Math.round(maxScore * 0.3)
    }

    const suggestions: string[] = []
    if (!hasH2) suggestions.push('Cần ít nhất 2 heading H2 trong bài viết')
    if (!hasHierarchy) suggestions.push('Sử dụng cả H2 và H3 để tạo cấu trúc phân cấp rõ ràng')
    if (!keywordInHeading) suggestions.push(`Thêm từ khoá "${keyword}" vào ít nhất 1 heading`)
    if (totalHeadings < 3) suggestions.push('Thêm heading để chia nội dung thành các phần rõ ràng hơn')
    if (totalHeadings > 15) suggestions.push('Quá nhiều heading, cân nhắc gộp hoặc bớt')

    return {
      type: ChecklistType.HEADING_STRUCTURE,
      passed,
      score,
      maxScore,
      details: { headings: headings.map(h => `${h.tag}: ${h.text}`), h2Count, h3Count, totalHeadings, keywordInHeading },
      suggestions,
    }
  }

  // ============================================================================
  // 4. IMAGE_ALT — Alt text cho hình ảnh
  // ============================================================================
  private checkImageAlt(
    images: Array<{ id: string; altText: string | null; fileName: string | null }>,
    keyword: string
  ): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.IMAGE_ALT]

    if (images.length === 0) {
      return {
        type: ChecklistType.IMAGE_ALT,
        passed: false,
        score: Math.round(maxScore * 0.3), // partial score — no images is a minor issue
        maxScore,
        details: { imageCount: 0 },
        suggestions: ['Thêm ít nhất 1 hình ảnh vào bài viết (có alt text chứa từ khoá)'],
      }
    }

    const withAlt = images.filter(img => img.altText && img.altText.trim().length > 0)
    const withKeywordAlt = images.filter(
      img => img.altText?.toLowerCase().includes(keyword.toLowerCase())
    )

    const altRatio = withAlt.length / images.length
    const hasKeywordInAlt = withKeywordAlt.length > 0
    const passed = altRatio >= 0.8 && hasKeywordInAlt

    let score = 0
    if (passed) score = maxScore
    else {
      score += Math.round(maxScore * 0.5 * altRatio)
      if (hasKeywordInAlt) score += Math.round(maxScore * 0.3)
    }

    const suggestions: string[] = []
    if (altRatio < 1) {
      const missing = images.length - withAlt.length
      suggestions.push(`${missing} hình ảnh thiếu alt text`)
    }
    if (!hasKeywordInAlt) {
      suggestions.push(`Thêm từ khoá "${keyword}" vào alt text của ít nhất 1 hình ảnh`)
    }

    return {
      type: ChecklistType.IMAGE_ALT,
      passed,
      score,
      maxScore,
      details: {
        imageCount: images.length,
        withAlt: withAlt.length,
        withKeywordAlt: withKeywordAlt.length,
        altRatio: Math.round(altRatio * 100),
      },
      suggestions,
    }
  }

  // ============================================================================
  // 5. IMAGE_FILENAME — Tên file ảnh chứa từ khoá
  // ============================================================================
  private checkImageFilename(
    images: Array<{ id: string; altText: string | null; fileName: string | null }>,
    keyword: string
  ): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.IMAGE_FILENAME]

    if (images.length === 0) {
      return {
        type: ChecklistType.IMAGE_FILENAME,
        passed: false,
        score: 0,
        maxScore,
        details: { imageCount: 0 },
        suggestions: ['Thêm hình ảnh với tên file mô tả (vd: tu-khoa-chinh.jpg)'],
      }
    }

    const keywordSlug = keyword.toLowerCase().replace(/\s+/g, '-')
    const keywordWords = keyword.toLowerCase().split(/\s+/)

    const descriptiveNames = images.filter(img => {
      if (!img.fileName) return false
      const name = img.fileName.toLowerCase()
      // Not generic names like IMG_001.jpg, screenshot.png
      return !(/^(img|image|screenshot|photo|pic|dsc|dscn|p\d+)[\-_]?\d*/i.test(name))
    })

    const withKeywordFilename = images.filter(img => {
      if (!img.fileName) return false
      const name = img.fileName.toLowerCase()
      return name.includes(keywordSlug) || keywordWords.some(w => w.length > 3 && name.includes(w))
    })

    const descriptiveRatio = images.length > 0 ? descriptiveNames.length / images.length : 0
    const hasKeywordFile = withKeywordFilename.length > 0
    const passed = descriptiveRatio >= 0.5 && hasKeywordFile

    let score = 0
    if (passed) score = maxScore
    else {
      score += Math.round(maxScore * 0.5 * descriptiveRatio)
      if (hasKeywordFile) score += Math.round(maxScore * 0.3)
    }

    const suggestions: string[] = []
    if (descriptiveRatio < 0.5) suggestions.push('Đặt tên file ảnh mô tả nội dung (tránh tên chung như IMG_001.jpg)')
    if (!hasKeywordFile) suggestions.push(`Đặt tên file ảnh chứa từ khoá "${keyword}" (vd: ${keywordSlug}.jpg)`)

    return {
      type: ChecklistType.IMAGE_FILENAME,
      passed,
      score,
      maxScore,
      details: {
        imageCount: images.length,
        descriptiveNames: descriptiveNames.length,
        withKeyword: withKeywordFilename.length,
      },
      suggestions,
    }
  }

  // ============================================================================
  // 6. KEYWORD_COVERAGE — Mật độ từ khoá
  // ============================================================================
  private checkKeywordCoverage(content: string, keyword: string, wordCount: number): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.KEYWORD_COVERAGE]

    if (!content || wordCount === 0) {
      return {
        type: ChecklistType.KEYWORD_COVERAGE,
        passed: false,
        score: 0,
        maxScore,
        details: { keywordCount: 0, wordCount: 0, density: 0 },
        suggestions: ['Viết nội dung bài viết trước khi kiểm tra mật độ từ khoá'],
      }
    }

    const wc = wordCount || content.split(/\s+/).length
    const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const keywordCount = (content.toLowerCase().match(new RegExp(escapedKeyword, 'g')) || []).length
    const density = wc > 0 ? (keywordCount / wc) * 100 : 0

    // Check keyword distribution across the content
    const thirds = [
      content.slice(0, Math.floor(content.length / 3)),
      content.slice(Math.floor(content.length / 3), Math.floor(content.length * 2 / 3)),
      content.slice(Math.floor(content.length * 2 / 3)),
    ]
    const thirdsWithKeyword = thirds.filter(t =>
      t.toLowerCase().includes(keyword.toLowerCase())
    ).length

    const goodDensity = density >= 0.5 && density <= 3.0
    const goodDistribution = thirdsWithKeyword >= 2
    const passed = goodDensity && goodDistribution

    let score = 0
    if (passed) score = maxScore
    else if (goodDensity) score = Math.round(maxScore * 0.7)
    else if (density > 0) score = Math.round(maxScore * 0.3)

    const suggestions: string[] = []
    if (density < 0.5) suggestions.push(`Sử dụng từ khoá "${keyword}" nhiều hơn (mật độ hiện tại: ${density.toFixed(2)}%)`)
    if (density > 3.0) suggestions.push('Mật độ từ khoá quá cao, giảm để tránh keyword stuffing')
    if (!goodDistribution) suggestions.push('Phân bố từ khoá đều hơn trong toàn bài viết')

    return {
      type: ChecklistType.KEYWORD_COVERAGE,
      passed,
      score,
      maxScore,
      details: {
        keywordCount,
        wordCount: wc,
        density: Math.round(density * 100) / 100,
        distribution: thirdsWithKeyword,
      },
      suggestions,
    }
  }

  // ============================================================================
  // 7. TAGS — Bài viết có tags/categories
  // ============================================================================
  private checkTags(
    articleKeywords: Array<{ articleId: string; keywordId: string; isPrimary: boolean; keyword: { keyword: string } }>
  ): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.TAGS]
    const keywordCount = articleKeywords.length
    const hasPrimary = articleKeywords.some(ak => ak.isPrimary)

    const passed = keywordCount >= 3 && hasPrimary

    let score = 0
    if (passed) score = maxScore
    else if (keywordCount >= 2) score = Math.round(maxScore * 0.6)
    else if (keywordCount >= 1) score = Math.round(maxScore * 0.3)

    const suggestions: string[] = []
    if (keywordCount < 3) suggestions.push(`Thêm tags/từ khoá phụ (hiện có: ${keywordCount}, cần tối thiểu 3)`)
    if (!hasPrimary) suggestions.push('Đánh dấu 1 từ khoá là primary keyword')

    return {
      type: ChecklistType.TAGS,
      passed,
      score,
      maxScore,
      details: {
        keywordCount,
        hasPrimary,
        keywords: articleKeywords.map(ak => ak.keyword.keyword),
      },
      suggestions,
    }
  }

  // ============================================================================
  // 8. INTERNAL_EXTERNAL_LINKS — Liên kết nội bộ và ngoài
  // ============================================================================
  private checkLinks(
    contentHtml: string,
    sourceLinks: Array<{ id: string; targetUrl: string | null; anchorText: string; status: string }>
  ): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.INTERNAL_EXTERNAL_LINKS]

    // Extract links from HTML content
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi
    const contentLinks: { url: string; text: string; isExternal: boolean }[] = []
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(contentHtml)) !== null) {
      const url = match[1]
      const text = match[2].replace(/<[^>]+>/g, '')
      const isExternal = url.startsWith('http') && !url.includes(process.env.NEXTAUTH_URL || 'localhost')
      contentLinks.push({ url, text, isExternal })
    }

    // Also check markdown links
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    while ((match = mdLinkRegex.exec(contentHtml)) !== null) {
      const url = match[2]
      const text = match[1]
      const isExternal = url.startsWith('http')
      contentLinks.push({ url, text, isExternal })
    }

    const internalLinks = contentLinks.filter(l => !l.isExternal).length + sourceLinks.length
    const externalLinks = contentLinks.filter(l => l.isExternal).length
    const totalLinks = internalLinks + externalLinks

    const hasInternal = internalLinks >= 2
    const hasExternal = externalLinks >= 1
    const passed = hasInternal && hasExternal

    let score = 0
    if (passed) score = maxScore
    else {
      if (hasInternal) score += Math.round(maxScore * 0.5)
      else if (internalLinks >= 1) score += Math.round(maxScore * 0.25)
      if (hasExternal) score += Math.round(maxScore * 0.3)
      if (totalLinks >= 1) score += Math.round(maxScore * 0.1)
    }

    const suggestions: string[] = []
    if (!hasInternal) suggestions.push(`Thêm liên kết nội bộ (hiện có: ${internalLinks}, cần tối thiểu 2)`)
    if (!hasExternal) suggestions.push('Thêm ít nhất 1 liên kết ngoài (tới nguồn uy tín)')
    if (totalLinks === 0) suggestions.push('Bài viết chưa có liên kết nào — thêm cả internal và external links')

    return {
      type: ChecklistType.INTERNAL_EXTERNAL_LINKS,
      passed,
      score,
      maxScore,
      details: {
        internalLinks,
        externalLinks,
        totalLinks,
        links: contentLinks.slice(0, 10).map(l => ({ url: l.url, text: l.text, type: l.isExternal ? 'external' : 'internal' })),
      },
      suggestions,
    }
  }

  // ============================================================================
  // 9. ANCHOR_TEXT — Anchor text liên kết có mô tả
  // ============================================================================
  private checkAnchorText(contentHtml: string, keyword: string): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.ANCHOR_TEXT]

    // Extract all link anchor texts
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi
    const anchors: { url: string; text: string }[] = []
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(contentHtml)) !== null) {
      anchors.push({ url: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() })
    }

    // Also check markdown links
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    while ((match = mdLinkRegex.exec(contentHtml)) !== null) {
      anchors.push({ url: match[2], text: match[1].trim() })
    }

    if (anchors.length === 0) {
      return {
        type: ChecklistType.ANCHOR_TEXT,
        passed: false,
        score: 0,
        maxScore,
        details: { anchorCount: 0 },
        suggestions: ['Thêm liên kết với anchor text mô tả vào bài viết'],
      }
    }

    // Check for generic anchor texts
    const genericTexts = ['click here', 'nhấn đây', 'xem thêm', 'tại đây', 'here', 'link', 'read more', 'click']
    const descriptiveAnchors = anchors.filter(a =>
      a.text.length > 2 && !genericTexts.some(g => a.text.toLowerCase() === g)
    )
    const keywordAnchors = anchors.filter(a =>
      a.text.toLowerCase().includes(keyword.toLowerCase())
    )

    const descriptiveRatio = descriptiveAnchors.length / anchors.length
    const hasKeywordAnchor = keywordAnchors.length > 0
    // Don't over-optimize — having keyword in ALL anchors is suspicious
    const naturalKeywordUse = keywordAnchors.length <= Math.ceil(anchors.length * 0.5)

    const passed = descriptiveRatio >= 0.8 && hasKeywordAnchor && naturalKeywordUse

    let score = 0
    if (passed) score = maxScore
    else {
      score += Math.round(maxScore * 0.5 * descriptiveRatio)
      if (hasKeywordAnchor) score += Math.round(maxScore * 0.3)
    }

    const suggestions: string[] = []
    if (descriptiveRatio < 0.8) suggestions.push('Tránh dùng anchor text chung chung như "nhấn đây", "xem thêm" — dùng mô tả cụ thể')
    if (!hasKeywordAnchor) suggestions.push(`Sử dụng từ khoá "${keyword}" trong anchor text của ít nhất 1 liên kết`)
    if (!naturalKeywordUse) suggestions.push('Quá nhiều anchor text chứa từ khoá — giảm để tự nhiên hơn')

    return {
      type: ChecklistType.ANCHOR_TEXT,
      passed,
      score,
      maxScore,
      details: {
        anchorCount: anchors.length,
        descriptiveAnchors: descriptiveAnchors.length,
        keywordAnchors: keywordAnchors.length,
        descriptiveRatio: Math.round(descriptiveRatio * 100),
      },
      suggestions,
    }
  }

  // ============================================================================
  // 10. CONTENT_LENGTH — Độ dài nội dung
  // ============================================================================
  private checkContentLength(wordCount: number): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.CONTENT_LENGTH]
    const minWords = 800
    const idealWords = 1500

    const passed = wordCount >= minWords

    let score = 0
    if (wordCount >= idealWords) score = maxScore
    else if (passed) score = Math.round(maxScore * 0.7 + maxScore * 0.3 * (wordCount - minWords) / (idealWords - minWords))
    else if (wordCount > 0) score = Math.round(maxScore * wordCount / minWords * 0.5)

    const suggestions: string[] = []
    if (wordCount < minWords) suggestions.push(`Bài viết cần ít nhất ${minWords} từ (hiện tại: ${wordCount} từ)`)
    else if (wordCount < idealWords) suggestions.push(`Bổ sung thêm nội dung để đạt ${idealWords}+ từ cho kết quả SEO tốt nhất`)

    return {
      type: ChecklistType.CONTENT_LENGTH,
      passed,
      score,
      maxScore,
      details: { wordCount, minRequired: minWords, idealLength: idealWords },
      suggestions,
    }
  }

  // ============================================================================
  // 11. READABILITY — Đọ đọc hiểu (Vietnamese Flesch)
  // ============================================================================
  private checkReadability(content: string): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.READABILITY]

    if (!content) {
      return {
        type: ChecklistType.READABILITY,
        passed: false,
        score: 0,
        maxScore,
        details: {},
        suggestions: ['Viết nội dung bài viết trước khi kiểm tra readability'],
      }
    }

    const readability = calculateReadability(content)
    const passed = readability.score >= 60

    let score = 0
    if (passed) score = maxScore
    else score = Math.round(maxScore * readability.score / 100)

    const suggestions: string[] = []
    if (!passed) {
      if (readability.avgWordsPerSentence > 25) suggestions.push('Viết các câu ngắn hơn (dưới 25 từ/câu)')
      suggestions.push('Sử dụng bullet points và danh sách')
      suggestions.push('Chia đoạn văn ngắn hơn (3-4 câu/đoạn)')
      if (readability.details.longSentencePenalty > 0) suggestions.push('Rút ngắn các câu quá dài (>30 từ)')
    }

    return {
      type: ChecklistType.READABILITY,
      passed,
      score,
      maxScore,
      details: {
        score: readability.score,
        grade: readability.grade,
        gradeLabel: readability.gradeLabel,
        avgWordsPerSentence: readability.avgWordsPerSentence,
        sentenceCount: readability.sentenceCount,
        wordCount: readability.wordCount,
      },
      suggestions,
    }
  }

  // ============================================================================
  // 12. CONTENT_GAP_COVERAGE — Bao phủ chủ đề liên quan
  // ============================================================================
  private checkContentGapCoverage(
    content: string,
    keyword: string,
    articleKeywords: Array<{ keyword: { keyword: string; serpData: any } }>
  ): SeoCheckResult {
    const maxScore = SEO_WEIGHTS[ChecklistType.CONTENT_GAP_COVERAGE]

    if (!content) {
      return {
        type: ChecklistType.CONTENT_GAP_COVERAGE,
        passed: false,
        score: 0,
        maxScore,
        details: {},
        suggestions: ['Viết nội dung trước khi phân tích content gap'],
      }
    }

    // Extract related terms from SERP data (People Also Ask, Related Searches)
    const relatedTerms: string[] = []
    for (const ak of articleKeywords) {
      if (ak.keyword.serpData) {
        const serpData = ak.keyword.serpData as any
        if (serpData.relatedSearches) {
          relatedTerms.push(...(serpData.relatedSearches as string[]))
        }
        if (serpData.peopleAlsoAsk) {
          relatedTerms.push(...(serpData.peopleAlsoAsk as string[]))
        }
      }
    }

    // If no SERP data, generate basic related terms from keyword
    if (relatedTerms.length === 0) {
      const keywordWords = keyword.toLowerCase().split(/\s+/)
      // Basic semantic expansion
      const basicTerms = [
        `${keyword} là gì`,
        `cách ${keyword}`,
        `lợi ích ${keyword}`,
        `${keyword} tốt nhất`,
        `hướng dẫn ${keyword}`,
      ]
      relatedTerms.push(...basicTerms)
    }

    // Check which related terms are covered in the content
    const contentLower = content.toLowerCase()
    const coveredTerms = relatedTerms.filter(term =>
      contentLower.includes(term.toLowerCase())
    )
    const coverage = relatedTerms.length > 0 ? coveredTerms.length / relatedTerms.length : 0

    const passed = coverage >= 0.4 // At least 40% of related terms covered

    let score = 0
    if (coverage >= 0.6) score = maxScore
    else if (passed) score = Math.round(maxScore * 0.7)
    else if (coverage > 0) score = Math.round(maxScore * coverage)

    const missingTerms = relatedTerms.filter(term =>
      !contentLower.includes(term.toLowerCase())
    ).slice(0, 5) // Show max 5 suggestions

    const suggestions: string[] = []
    if (!passed) {
      suggestions.push('Bổ sung nội dung về các chủ đề liên quan mà người đọc quan tâm:')
      for (const term of missingTerms) {
        suggestions.push(`• Thêm phần về: "${term}"`)
      }
    }

    return {
      type: ChecklistType.CONTENT_GAP_COVERAGE,
      passed,
      score,
      maxScore,
      details: {
        relatedTerms: relatedTerms.length,
        coveredTerms: coveredTerms.length,
        coverage: Math.round(coverage * 100),
        missing: missingTerms,
      },
      suggestions,
    }
  }
}

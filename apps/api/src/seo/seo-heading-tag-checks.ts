import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 3. HEADING_STRUCTURE — Cấu trúc heading H2/H3/H4
// ============================================================================
export function checkHeadingStructure(contentHtml: string, keyword: string): SeoCheckResult {
  const maxScore = SEO_WEIGHTS[ChecklistType.HEADING_STRUCTURE]

  const headingRegex = /<(h[2-6])[^>]*>(.*?)<\/\1>/gi
  const headings: { tag: string; text: string }[] = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(contentHtml)) !== null) {
    headings.push({ tag: match[1].toLowerCase(), text: match[2].replace(/<[^>]+>/g, '') })
  }

  const mdHeadingRegex = /^(#{2,6})\s+(.+)$/gm
  while ((match = mdHeadingRegex.exec(contentHtml)) !== null) {
    headings.push({ tag: `h${match[1].length}`, text: match[2].trim() })
  }

  const h2Count = headings.filter(h => h.tag === 'h2').length
  const h3Count = headings.filter(h => h.tag === 'h3').length
  const totalHeadings = headings.length
  const keywordInHeading = headings.some(h => h.text.toLowerCase().includes(keyword.toLowerCase()))

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
    details: {
      headings: headings.map(h => `${h.tag}: ${h.text}`),
      h2Count,
      h3Count,
      totalHeadings,
      keywordInHeading,
    },
    suggestions,
  }
}

// ============================================================================
// 7. TAGS — Bài viết có tags/categories
// ============================================================================
export function checkTags(
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

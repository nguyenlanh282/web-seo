import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 6. KEYWORD_COVERAGE — Mật độ từ khoá
// ============================================================================
export function checkKeywordCoverage(content: string, keyword: string, wordCount: number): SeoCheckResult {
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

  const thirds = [
    content.slice(0, Math.floor(content.length / 3)),
    content.slice(Math.floor(content.length / 3), Math.floor(content.length * 2 / 3)),
    content.slice(Math.floor(content.length * 2 / 3)),
  ]
  const thirdsWithKeyword = thirds.filter(t => t.toLowerCase().includes(keyword.toLowerCase())).length

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
    details: { keywordCount, wordCount: wc, density: Math.round(density * 100) / 100, distribution: thirdsWithKeyword },
    suggestions,
  }
}

import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 12. CONTENT_GAP_COVERAGE — Bao phủ chủ đề liên quan
// ============================================================================
export function checkContentGapCoverage(
  content: string,
  keyword: string,
  articleKeywords: Array<{ keyword: { keyword: string; serpData: unknown } }>
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

  const relatedTerms: string[] = []
  for (const ak of articleKeywords) {
    if (ak.keyword.serpData) {
      const serpData = ak.keyword.serpData as Record<string, unknown>
      if (Array.isArray(serpData.relatedSearches)) relatedTerms.push(...(serpData.relatedSearches as string[]))
      if (Array.isArray(serpData.peopleAlsoAsk)) relatedTerms.push(...(serpData.peopleAlsoAsk as string[]))
    }
  }

  if (relatedTerms.length === 0) {
    // Basic semantic expansion when no SERP data is available
    relatedTerms.push(
      `${keyword} là gì`,
      `cách ${keyword}`,
      `lợi ích ${keyword}`,
      `${keyword} tốt nhất`,
      `hướng dẫn ${keyword}`,
    )
  }

  const contentLower = content.toLowerCase()
  const coveredTerms = relatedTerms.filter(term => contentLower.includes(term.toLowerCase()))
  const coverage = relatedTerms.length > 0 ? coveredTerms.length / relatedTerms.length : 0
  const passed = coverage >= 0.4

  let score = 0
  if (coverage >= 0.6) score = maxScore
  else if (passed) score = Math.round(maxScore * 0.7)
  else if (coverage > 0) score = Math.round(maxScore * coverage)

  const missingTerms = relatedTerms
    .filter(term => !contentLower.includes(term.toLowerCase()))
    .slice(0, 5)

  const suggestions: string[] = []
  if (!passed) {
    suggestions.push('Bổ sung nội dung về các chủ đề liên quan mà người đọc quan tâm:')
    for (const term of missingTerms) suggestions.push(`• Thêm phần về: "${term}"`)
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

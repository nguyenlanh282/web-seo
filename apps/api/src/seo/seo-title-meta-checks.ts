import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 1. HEADLINE_KEYWORD — Từ khoá chính có trong tiêu đề
// ============================================================================
export function checkHeadlineKeyword(title: string | null, keyword: string): SeoCheckResult {
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
export function checkMetaDescription(meta: string | null, keyword: string): SeoCheckResult {
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

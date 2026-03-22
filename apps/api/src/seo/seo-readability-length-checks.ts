import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS, calculateReadability } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 10. CONTENT_LENGTH — Độ dài nội dung
// ============================================================================
export function checkContentLength(wordCount: number): SeoCheckResult {
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
// 11. READABILITY — Độ đọc hiểu (Vietnamese Flesch)
// ============================================================================
export function checkReadability(content: string): SeoCheckResult {
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
  const score = passed ? maxScore : Math.round(maxScore * readability.score / 100)

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

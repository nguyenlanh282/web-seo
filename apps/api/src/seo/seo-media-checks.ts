import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

type ImageRow = { id: string; altText: string | null; fileName: string | null }

// ============================================================================
// 4. IMAGE_ALT — Alt text cho hình ảnh
// ============================================================================
export function checkImageAlt(images: ImageRow[], keyword: string): SeoCheckResult {
  const maxScore = SEO_WEIGHTS[ChecklistType.IMAGE_ALT]

  if (images.length === 0) {
    return {
      type: ChecklistType.IMAGE_ALT,
      passed: false,
      score: Math.round(maxScore * 0.3),
      maxScore,
      details: { imageCount: 0 },
      suggestions: ['Thêm ít nhất 1 hình ảnh vào bài viết (có alt text chứa từ khoá)'],
    }
  }

  const withAlt = images.filter(img => img.altText && img.altText.trim().length > 0)
  const withKeywordAlt = images.filter(img => img.altText?.toLowerCase().includes(keyword.toLowerCase()))

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
  if (altRatio < 1) suggestions.push(`${images.length - withAlt.length} hình ảnh thiếu alt text`)
  if (!hasKeywordInAlt) suggestions.push(`Thêm từ khoá "${keyword}" vào alt text của ít nhất 1 hình ảnh`)

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
export function checkImageFilename(images: ImageRow[], keyword: string): SeoCheckResult {
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
    return !(/^(img|image|screenshot|photo|pic|dsc|dscn|p\d+)[\-_]?\d*/i.test(img.fileName.toLowerCase()))
  })

  const withKeywordFilename = images.filter(img => {
    if (!img.fileName) return false
    const name = img.fileName.toLowerCase()
    return name.includes(keywordSlug) || keywordWords.some(w => w.length > 3 && name.includes(w))
  })

  const descriptiveRatio = descriptiveNames.length / images.length
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

import { ChecklistType } from '@prisma/client'
import { SEO_WEIGHTS } from '@seopen/shared'
import type { SeoCheckResult } from './seo.service'

// ============================================================================
// 8. INTERNAL_EXTERNAL_LINKS — Liên kết nội bộ và ngoài
// ============================================================================
export function checkLinks(
  contentHtml: string,
  sourceLinks: Array<{ id: string; targetUrl: string | null; anchorText: string; status: string }>
): SeoCheckResult {
  const maxScore = SEO_WEIGHTS[ChecklistType.INTERNAL_EXTERNAL_LINKS]

  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi
  const contentLinks: { url: string; text: string; isExternal: boolean }[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(contentHtml)) !== null) {
    const url = match[1]
    const text = match[2].replace(/<[^>]+>/g, '')
    const isExternal = url.startsWith('http') && !url.includes(process.env.NEXTAUTH_URL || 'localhost')
    contentLinks.push({ url, text, isExternal })
  }

  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = mdLinkRegex.exec(contentHtml)) !== null) {
    const url = match[2]
    contentLinks.push({ url, text: match[1], isExternal: url.startsWith('http') })
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
export function checkAnchorText(contentHtml: string, keyword: string): SeoCheckResult {
  const maxScore = SEO_WEIGHTS[ChecklistType.ANCHOR_TEXT]

  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi
  const anchors: { url: string; text: string }[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(contentHtml)) !== null) {
    anchors.push({ url: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() })
  }

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

  const genericTexts = ['click here', 'nhấn đây', 'xem thêm', 'tại đây', 'here', 'link', 'read more', 'click']
  const descriptiveAnchors = anchors.filter(a => a.text.length > 2 && !genericTexts.some(g => a.text.toLowerCase() === g))
  const keywordAnchors = anchors.filter(a => a.text.toLowerCase().includes(keyword.toLowerCase()))
  const descriptiveRatio = descriptiveAnchors.length / anchors.length
  const hasKeywordAnchor = keywordAnchors.length > 0
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

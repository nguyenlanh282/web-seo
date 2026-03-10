import { ArticleStatus } from '@prisma/client'

/**
 * Article State Machine
 *
 * Valid transitions:
 * DRAFT → KEYWORD_ANALYZED
 * KEYWORD_ANALYZED → DRAFT, OUTLINED
 * OUTLINED → KEYWORD_ANALYZED, CONTENT_WRITTEN
 * CONTENT_WRITTEN → OUTLINED, SEO_CHECKED
 * SEO_CHECKED → CONTENT_WRITTEN, EXPORTED
 * EXPORTED → SEO_CHECKED, PUBLISHED
 * PUBLISHED → EXPORTED
 */
export const TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  [ArticleStatus.DRAFT]: [ArticleStatus.KEYWORD_ANALYZED],
  [ArticleStatus.KEYWORD_ANALYZED]: [ArticleStatus.DRAFT, ArticleStatus.OUTLINED],
  [ArticleStatus.OUTLINED]: [ArticleStatus.KEYWORD_ANALYZED, ArticleStatus.CONTENT_WRITTEN],
  [ArticleStatus.CONTENT_WRITTEN]: [ArticleStatus.OUTLINED, ArticleStatus.SEO_CHECKED],
  [ArticleStatus.SEO_CHECKED]: [ArticleStatus.CONTENT_WRITTEN, ArticleStatus.EXPORTED],
  [ArticleStatus.EXPORTED]: [ArticleStatus.SEO_CHECKED, ArticleStatus.PUBLISHED],
  [ArticleStatus.PUBLISHED]: [ArticleStatus.EXPORTED],
}

/**
 * Assert that a state transition is valid.
 * @throws BadRequestException if transition is invalid
 */
export function assertTransition(from: ArticleStatus, to: ArticleStatus): void {
  if (!TRANSITIONS[from]?.includes(to)) {
    const validTransitions = TRANSITIONS[from]?.join(', ') || 'none'
    throw new Error(
      `Invalid state transition: ${from} → ${to}. Valid transitions: ${validTransitions}`,
    )
  }
}

/**
 * Check if an article is in a state that allows editing content.
 */
export function canEditContent(status: ArticleStatus): boolean {
  return status === ArticleStatus.DRAFT || status === ArticleStatus.CONTENT_WRITTEN
}

/**
 * Check if an article can be published to WordPress.
 */
export function canPublish(status: ArticleStatus): boolean {
  return status === ArticleStatus.EXPORTED || status === ArticleStatus.PUBLISHED
}

/**
 * Check if an article can proceed to the next step.
 */
export function canProceed(status: ArticleStatus): boolean {
  return TRANSITIONS[status]?.length > 0 && status !== ArticleStatus.PUBLISHED
}

import { ChecklistType } from '../types'

export const SEO_WEIGHTS: Record<ChecklistType, number> = {
  [ChecklistType.HEADLINE_KEYWORD]: 12,
  [ChecklistType.META_DESCRIPTION]: 10,
  [ChecklistType.HEADING_STRUCTURE]: 12,
  [ChecklistType.IMAGE_ALT]: 6,
  [ChecklistType.IMAGE_FILENAME]: 4,
  [ChecklistType.KEYWORD_COVERAGE]: 15,
  [ChecklistType.TAGS]: 4,
  [ChecklistType.INTERNAL_EXTERNAL_LINKS]: 12,
  [ChecklistType.ANCHOR_TEXT]: 5,
  [ChecklistType.CONTENT_LENGTH]: 5,
  [ChecklistType.READABILITY]: 10,
  [ChecklistType.CONTENT_GAP_COVERAGE]: 5,
}

export function calculateSeoScore(
  passedChecks: ChecklistType[],
  failedChecks: ChecklistType[]
): number {
  const totalPossible = Object.values(SEO_WEIGHTS).reduce((a, b) => a + b, 0)
  const earned = passedChecks.reduce((sum, check) => sum + (SEO_WEIGHTS[check] || 0), 0)
  return Math.round((earned / totalPossible) * 100)
}

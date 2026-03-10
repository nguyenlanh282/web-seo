export interface OutlineSection {
  id: string // cuid
  level: 2 | 3 // H2 or H3
  title: string
  wordCount: number // suggested words for this section
  contentGap: boolean // flag if this covers a gap from Step 1
  children?: OutlineSection[] // only for level 2 (H2)
}

export interface OutlineData {
  sections: OutlineSection[]
  contentGaps: string[]
}

// Validation helper
export function isValidOutline(data: unknown): data is OutlineData {
  if (!data || typeof data !== 'object') return false
  const d = data as any
  if (!Array.isArray(d.sections)) return false
  return d.sections.every((s: any) =>
    typeof s === 'object' &&
    typeof s.id === 'string' &&
    (s.level === 2 || s.level === 3) &&
    typeof s.title === 'string' &&
    typeof s.wordCount === 'number' &&
    typeof s.contentGap === 'boolean'
  )
}

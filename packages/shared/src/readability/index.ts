/**
 * Vietnamese-adapted Flesch Readability Formula
 * Shared between frontend (Next.js) and backend (NestJS)
 *
 * Grade mapping:
 * 80-100: Rất dễ đọc
 * 60-79:  Dễ đọc
 * 40-59:  Trung bình
 * 20-39:  Khó đọc
 * 0-19:   Rất khó đọc
 */

export type ReadabilityGrade =
  | 'very_easy'    // 80-100
  | 'easy'         // 60-79
  | 'medium'       // 40-59
  | 'hard'         // 20-39
  | 'very_hard'    // 0-19

export type ReadabilityResult = {
  score: number
  grade: ReadabilityGrade
  gradeLabel: string
  avgWordsPerSentence: number
  sentenceCount: number
  wordCount: number
  details: {
    baseScore: number
    bulletBonus: number
    tableBonus: number
    shortParaBonus: number
    longSentencePenalty: number
    longParaPenalty: number
  }
}

/**
 * Preprocess text: strip HTML/Markdown/URLs/code blocks, normalize whitespace
 */
function preprocessText(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/www\.\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split Vietnamese text into sentences
 */
function splitSentences(text: string): string[] {
  const protected_ = text.replace(/(\d+)\.(\d+)/g, '$1_DECIMAL_$2')
  const sentences = protected_
    .split(/[.!?]+/)
    .map(s => s.replace(/_DECIMAL_/g, '.').trim())
    .filter(s => s.length > 3)
  return sentences
}

/**
 * Count Vietnamese syllables (1 syllable per space-separated word)
 */
function countSyllables(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Count bullet points and tables in original (HTML/Markdown) text
 */
function countStructuralElements(originalText: string): {
  bulletCount: number
  tableCount: number
  shortParaCount: number
  longParaCount: number
} {
  const bulletCount = (originalText.match(/^[\s]*[-*•]\s/gm) || []).length +
    (originalText.match(/<li>/gi) || []).length

  const tableCount = (originalText.match(/<table/gi) || []).length +
    (originalText.match(/\|.+\|/gm) || []).length

  const paragraphs = originalText
    .replace(/<[^>]+>/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const shortParaCount = paragraphs.filter(p => p.split(/\s+/).length <= 50).length
  const longParaCount = paragraphs.filter(p => p.split(/\s+/).length > 150).length

  return { bulletCount, tableCount, shortParaCount, longParaCount }
}

/**
 * Calculate Vietnamese readability score
 */
export function calculateReadability(text: string): ReadabilityResult {
  const cleanText = preprocessText(text)
  const sentences = splitSentences(cleanText)

  if (sentences.length === 0) {
    return {
      score: 0,
      grade: 'very_hard',
      gradeLabel: 'Rất khó đọc',
      avgWordsPerSentence: 0,
      sentenceCount: 0,
      wordCount: 0,
      details: { baseScore: 0, bulletBonus: 0, tableBonus: 0, shortParaBonus: 0, longSentencePenalty: 0, longParaPenalty: 0 },
    }
  }

  const wordCount = countSyllables(cleanText)
  const sentenceCount = sentences.length
  const avgWordsPerSentence = wordCount / sentenceCount

  const baseScore = 100 - (avgWordsPerSentence - 15) * 3

  const { bulletCount, tableCount, shortParaCount, longParaCount } = countStructuralElements(text)
  const bulletBonus = Math.min(bulletCount * 2, 10)
  const tableBonus = Math.min(tableCount * 3, 6)
  const shortParaBonus = Math.min(shortParaCount * 1, 5)

  const longSentences = sentences.filter(s => s.split(/\s+/).length > 30).length
  const longSentencePenalty = Math.min(longSentences * 3, 15)
  const longParaPenalty = Math.min(longParaCount * 4, 12)

  const rawScore = baseScore + bulletBonus + tableBonus + shortParaBonus - longSentencePenalty - longParaPenalty
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  const getGrade = (s: number): { grade: ReadabilityGrade; label: string } => {
    if (s >= 80) return { grade: 'very_easy', label: 'Rất dễ đọc' }
    if (s >= 60) return { grade: 'easy', label: 'Dễ đọc' }
    if (s >= 40) return { grade: 'medium', label: 'Trung bình' }
    if (s >= 20) return { grade: 'hard', label: 'Khó đọc' }
    return { grade: 'very_hard', label: 'Rất khó đọc' }
  }

  const { grade, label } = getGrade(score)

  return {
    score,
    grade,
    gradeLabel: label,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    sentenceCount,
    wordCount,
    details: {
      baseScore: Math.round(baseScore),
      bulletBonus,
      tableBonus,
      shortParaBonus,
      longSentencePenalty,
      longParaPenalty,
    },
  }
}

export const READABILITY_GRADES: Record<ReadabilityGrade, string> = {
  very_easy: 'Rất dễ đọc',
  easy: 'Dễ đọc',
  medium: 'Trung bình',
  hard: 'Khó đọc',
  very_hard: 'Rất khó đọc',
}

import { Injectable, Logger, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ArticleStatus } from '@prisma/client'

export interface InternalLinkSuggestion {
  articleId: string
  title: string
  targetKeyword: string
  slug: string | null
  relevanceScore: number  // 0-100
  anchorText: string      // suggested anchor text = targetKeyword of the linked article
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|  (on token sets)
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-zàáâãèéêìíòóôõùúăđĩũơưạ-ỹ\s]/gi, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1),
    )

  const setA = tokenize(a)
  const setB = tokenize(b)

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection++
  }

  const union = setA.size + setB.size - intersection  // O(1), no allocation
  if (union === 0) return 0
  return intersection / union
}

const PUBLISHABLE_STATUSES: ArticleStatus[] = [
  ArticleStatus.SEO_CHECKED,
  ArticleStatus.EXPORTED,
  ArticleStatus.PUBLISHED,
]

@Injectable()
export class InternalLinkService {
  private readonly logger = new Logger(InternalLinkService.name)

  constructor(private readonly prisma: PrismaService) {}

  async suggest(
    articleId: string,
    userId: string,
    topN = 5,
  ): Promise<InternalLinkSuggestion[]> {
    // Load source article — validate ownership before leaking any data
    const source = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, targetKeyword: true, projectId: true, title: true, userId: true },
    })

    if (!source) return []
    // Ownership check: prevent cross-user data leak of targetKeyword / title
    if (source.userId !== userId) throw new ForbiddenException('Access denied')

    // Build query: same project (if any) OR same user, exclude self
    const candidates = await this.prisma.article.findMany({
      where: {
        id: { not: articleId },
        userId,
        status: { in: PUBLISHABLE_STATUSES },
        ...(source.projectId ? { projectId: source.projectId } : {}),
      },
      select: {
        id: true,
        title: true,
        targetKeyword: true,
        slug: true,
      },
      take: 100, // cap to avoid O(n) explosion on large accounts
    })

    if (candidates.length === 0) return []

    // Score each candidate using Jaccard similarity on keyword tokens
    const sourceText = `${source.targetKeyword} ${source.title}`

    const scored = candidates
      .map((c) => {
        const candidateText = `${c.targetKeyword} ${c.title}`
        const score = jaccardSimilarity(sourceText, candidateText)
        return {
          articleId: c.id,
          title: c.title,
          targetKeyword: c.targetKeyword,
          slug: c.slug,
          relevanceScore: Math.round(score * 100),
          anchorText: c.targetKeyword,
        }
      })
      .filter((s) => s.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topN)

    return scored
  }
}

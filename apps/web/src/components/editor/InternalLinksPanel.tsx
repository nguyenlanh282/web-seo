'use client'

import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Link2, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkSuggestion {
  articleId: string
  title: string
  targetKeyword: string
  slug: string | null
  relevanceScore: number
  anchorText: string
}

interface InternalLinksPanelProps {
  articleId: string
  /** If provided, the "Insert" button copies the anchor text + path */
  onInsert?: (anchorText: string, path: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? 'bg-green-100 text-green-800'
      : score >= 30
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-600'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {score}%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InternalLinksPanel({
  articleId,
  onInsert,
}: InternalLinksPanelProps) {
  const { data: suggestions = [], isLoading, error, refetch } = useQuery<LinkSuggestion[]>({
    queryKey: ['internal-links', articleId],
    queryFn: () => articlesApi.internalLinks(articleId),
    staleTime: 60_000,
  })

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tìm kiếm liên kết nội bộ...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        Không thể tải gợi ý.{' '}
        <button onClick={() => refetch()} className="underline">
          Thử lại
        </button>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        <Link2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Không tìm thấy bài viết liên quan trong cùng project.
        <br />
        <span className="text-xs">
          Cần có bài đã kiểm tra SEO / xuất / đăng trong cùng project.
        </span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Info className="h-3.5 w-3.5" />
          <span>
            {suggestions.length} bài viết liên quan — thêm internal link để tăng SEO
          </span>
        </div>

        {suggestions.map((s) => {
          // Only use slug-based paths — never expose internal UUIDs in copied HTML.
          // Articles without a slug produce broken public links anyway.
          const hasSlug = !!s.slug
          const path = hasSlug ? `/${s.slug}` : null

          return (
            <Card key={s.articleId} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 px-4 py-3">
                {/* Score */}
                <ScoreBadge score={s.relevanceScore} />

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800" title={s.title}>
                    {s.title}
                  </p>
                  {hasSlug ? (
                    <p className="truncate text-xs text-slate-400">
                      Anchor:{' '}
                      <code className="rounded bg-slate-100 px-1">{s.anchorText}</code>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">Chưa có slug — thêm slug để link</p>
                  )}
                </div>

                {/* Actions — only available when a slug exists */}
                {hasSlug && path && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            // Escape to prevent XSS when user pastes into WP HTML editor
                            const link = `<a href="${escapeHtml(path)}">${escapeHtml(s.anchorText)}</a>`
                            navigator.clipboard.writeText(link)
                            toast.success('Đã copy HTML link')
                          }}
                        >
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Copy HTML anchor tag
                      </TooltipContent>
                    </Tooltip>

                    {onInsert && (
                      <Button
                        size="sm"
                        className="h-8 px-2 text-xs"
                        // Pass RAW strings to the rich-text editor — escaping is the editor's job.
                        // escapeHtml is only for the clipboard Copy path (raw HTML string).
                        onClick={() => onInsert(s.anchorText, path)}
                      >
                        <Link2 className="mr-1 h-3.5 w-3.5" />
                        Chèn
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

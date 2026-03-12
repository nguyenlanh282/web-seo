'use client'

import Link from 'next/link'
import { FileText, Plus, ArrowRight } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; bg: string }> = {
  DRAFT:            { label: 'Draft',     bg: 'bg-gray-200 border-gray-600 text-gray-700' },
  KEYWORD_ANALYZED: { label: 'KW Done',   bg: 'bg-blue-200 border-blue-600 text-blue-800' },
  OUTLINED:         { label: 'Outlined',  bg: 'bg-yellow-200 border-yellow-600 text-yellow-800' },
  CONTENT_WRITTEN:  { label: 'Written',   bg: 'bg-purple-200 border-purple-600 text-purple-800' },
  SEO_CHECKED:      { label: 'SEO ✓',     bg: 'bg-green-200 border-green-700 text-green-800' },
  EXPORTED:         { label: 'Exported',  bg: 'bg-green-200 border-green-700 text-green-800' },
  PUBLISHED:        { label: 'Published', bg: 'bg-green-300 border-green-800 text-green-900' },
}

function seoScoreColor(score: number) {
  if (score >= 90) return 'text-green-700'
  if (score >= 70) return 'text-blue-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

interface Article {
  id: string
  title: string
  status: string
  seoScore?: number | null
  updatedAt?: string
}

interface RecentArticlesSectionProps {
  articles: Article[]
  articlesUsed: number
  articlesLimit: number
}

export function RecentArticlesSection({
  articles,
  articlesUsed,
  articlesLimit,
}: RecentArticlesSectionProps) {
  const isQuotaExhausted = articlesUsed >= articlesLimit
  const recent = articles.slice(0, 6)

  return (
    <div
      className="nb-card-static bg-nb-bg p-5 flex flex-col gap-4"
      style={{ fontFamily: 'var(--nb-font-body)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-bold text-[#0D0D0D] uppercase tracking-wide"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Recent Articles
        </h3>
        <Link href="/projects">
          <button className="nb-btn px-3 py-1 bg-white text-[#0D0D0D] text-xs flex items-center gap-1 cursor-pointer">
            View all <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </Link>
      </div>

      {/* Empty state */}
      {recent.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div
            className="w-14 h-14 rounded-xl border-[3px] border-black bg-nb-yellow flex items-center justify-center"
            style={{ boxShadow: '4px 4px 0 #000' }}
          >
            <FileText className="w-7 h-7 text-black" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[#0D0D0D]">No articles yet</p>
          <p className="text-xs text-gray-500">Create your first article to get started!</p>
          <Link href="/projects">
            <button
              className="nb-btn px-4 py-2 bg-nb-primary text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
              disabled={isQuotaExhausted}
              aria-disabled={isQuotaExhausted}
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {isQuotaExhausted ? 'Quota exceeded' : 'Create Article'}
            </button>
          </Link>
        </div>
      )}

      {/* Articles table */}
      {recent.length > 0 && (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr style={{ borderBottom: '3px solid #000' }}>
                {['Title', 'Status', 'SEO Score', 'Updated'].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-left text-xs font-bold uppercase tracking-wide text-[#0D0D0D]"
                    style={{ fontFamily: 'var(--nb-font-heading)' }}
                  >
                    {h}
                  </th>
                ))}
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {recent.map((article, i) => {
                const st = STATUS_LABEL[article.status] ?? STATUS_LABEL.DRAFT
                const updated = article.updatedAt
                  ? new Date(article.updatedAt).toLocaleDateString('en-GB')
                  : '—'
                return (
                  <tr
                    key={article.id}
                    className={`border-b border-black/10 hover:bg-nb-yellow/20 transition-colors duration-150 ${i % 2 ? 'bg-black/[0.015]' : ''}`}
                  >
                    <td className="py-2.5 pr-4 max-w-[240px]">
                      <Link
                        href={`/articles/${article.id}`}
                        className="font-semibold text-[#0D0D0D] hover:text-nb-primary transition-colors line-clamp-1 cursor-pointer"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`nb-badge text-xs font-bold ${st.bg}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {article.seoScore != null ? (
                        <span
                          className={`font-bold ${seoScoreColor(article.seoScore)}`}
                          style={{ fontFamily: 'var(--nb-font-heading)' }}
                        >
                          {article.seoScore}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-mono text-gray-500">{updated}</td>
                    <td className="py-2.5 text-right">
                      <Link href={`/articles/${article.id}`}>
                        <button className="nb-btn px-2.5 py-1 bg-white text-xs font-bold cursor-pointer">
                          Edit
                        </button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { usersApi, articlesApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FileText,
  CheckCircle2,
  FileEdit,
  TrendingUp,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react'

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'secondary' | 'warning' | 'default' | 'success' | 'ai' }> = {
  DRAFT: { label: 'Nháp', variant: 'secondary' },
  KEYWORD_ANALYZED: { label: 'Đã phân tích KW', variant: 'warning' },
  OUTLINED: { label: 'Có đề cương', variant: 'warning' },
  CONTENT_WRITTEN: { label: 'Đã viết nội dung', variant: 'default' },
  SEO_CHECKED: { label: 'Đã kiểm tra SEO', variant: 'success' },
  EXPORTED: { label: 'Đã xuất', variant: 'success' },
  PUBLISHED: { label: 'Đã đăng', variant: 'success' },
}

function getSeoScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-blue-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-blue-600'
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.stats(),
  })

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['recent-articles'],
    queryFn: () => articlesApi.list(),
  })

  const isLoading = statsLoading || articlesLoading

  const totalArticles = stats?.totalArticles ?? 0
  const publishedArticles = stats?.publishedArticles ?? 0
  const draftArticles = stats?.draftArticles ?? 0
  const avgSeoScore = stats?.avgSeoScore ?? 0
  const articlesLimit = stats?.articlesLimit ?? 30
  const articlesUsed = stats?.articlesUsed ?? 0
  const quotaPercent = articlesLimit > 0 ? Math.round((articlesUsed / articlesLimit) * 100) : 0
  const isQuotaExhausted = articlesUsed >= articlesLimit

  const recentArticles = Array.isArray(articlesData) ? articlesData : []

  const statCards = [
    {
      label: 'Tổng bài viết',
      value: totalArticles,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      borderColor: 'border-t-blue-500',
    },
    {
      label: 'Đã xuất bản',
      value: publishedArticles,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      borderColor: 'border-t-green-500',
    },
    {
      label: 'Bản nháp',
      value: draftArticles,
      icon: FileEdit,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      borderColor: 'border-t-amber-500',
    },
    {
      label: 'Điểm SEO TB',
      value: avgSeoScore,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      borderColor: 'border-t-purple-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-md">
        <h1 className="text-xl font-bold">
          Xin chào{user?.name ? `, ${user.name}` : ''}! 👋
        </h1>
        <p className="text-blue-100 mt-1 text-sm">
          Bạn còn <strong>{articlesLimit - articlesUsed}/{articlesLimit} bài viết</strong> trong tháng này
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 max-w-xs bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white rounded-full h-2 transition-all duration-600"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <span className="text-xs text-blue-100">{quotaPercent}%</span>
        </div>
        <Link href="/projects">
          <Button
            size="sm"
            className="mt-4 bg-white text-blue-600 hover:bg-blue-50 shadow-sm font-medium"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Bài viết mới
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={`border-t-[3px] ${stat.borderColor}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`${stat.bg} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Article quota progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Hạn mức bài viết tháng này</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đã sử dụng {articlesUsed} / {articlesLimit} bài viết
              </p>
            </div>
            <span className={`text-sm font-bold ${getProgressColor(quotaPercent) === 'bg-red-500' ? 'text-red-600' : quotaPercent >= 70 ? 'text-amber-600' : 'text-blue-600'}`}>
              {quotaPercent}%
            </span>
          </div>
          <Progress
            value={quotaPercent}
            className="h-2"
            indicatorClassName={getProgressColor(quotaPercent)}
          />
        </CardContent>
      </Card>

      {/* Recent articles table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Bài viết gần đây</CardTitle>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">
              Xem tất cả
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentArticles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Chưa có bài viết nào. Tạo bài viết đầu tiên để bắt đầu!
              </p>
              <Link href="/projects">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={isQuotaExhausted ? 0 : undefined} className="inline-flex">
                        <Button
                          size="sm"
                          className="mt-3 bg-blue-600 hover:bg-blue-700"
                          disabled={isQuotaExhausted}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Tạo bài viết
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isQuotaExhausted && (
                      <TooltipContent>
                        Hết quota tháng này — Nâng cấp
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Điểm SEO
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Ngày cập nhật
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recentArticles.slice(0, 5).map((article: any) => {
                    const statusInfo = STATUS_BADGE_MAP[article.status] || STATUS_BADGE_MAP.DRAFT
                    const updatedDate = article.updatedAt
                      ? new Date(article.updatedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'

                    return (
                      <tr
                        key={article.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/articles/${article.id}`}
                            className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {article.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {article.seoScore != null ? (
                            <span className={`font-semibold ${getSeoScoreColor(article.seoScore)}`}>
                              {article.seoScore}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[13px]">{updatedDate}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/articles/${article.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">
                              Chỉnh sửa
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

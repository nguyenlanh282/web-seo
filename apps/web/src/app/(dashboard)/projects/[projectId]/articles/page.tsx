'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articlesApi, projectsApi, usersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  Search,
} from 'lucide-react'

interface Article {
  id: string
  title: string
  status: string
  targetKeyword?: string
  seoScore?: number | null
  createdAt: string
  updatedAt: string
}

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

function getSeoScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-50'
  if (score >= 70) return 'bg-blue-50'
  if (score >= 50) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function ArticlesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formKeyword, setFormKeyword] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  const { data: articlesData = [], isLoading } = useQuery({
    queryKey: ['articles', projectId],
    queryFn: () => articlesApi.list(projectId),
  })

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.stats(),
  })

  const articles: Article[] = Array.isArray(articlesData) ? articlesData : []

  const articlesUsed = stats?.articlesUsedMonth ?? stats?.articlesUsed ?? 0
  const articlesLimit = stats?.articlesLimit ?? 30
  const isQuotaExhausted = articlesUsed >= articlesLimit

  const createMutation = useMutation({
    mutationFn: (data: { title: string; targetKeyword: string; projectId: string }) =>
      articlesApi.create(data),
    onSuccess: (newArticle: any) => {
      queryClient.invalidateQueries({ queryKey: ['articles', projectId] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Tạo bài viết thành công!')
      router.push(`/articles/${newArticle.id}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Tạo bài viết thất bại')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: articlesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', projectId] })
      setDeleteConfirmId(null)
      toast.success('Đã xóa bài viết')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Xóa bài viết thất bại')
    },
  })

  const resetForm = () => {
    setFormTitle('')
    setFormKeyword('')
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formKeyword.trim()) {
      toast.error('Vui lòng nhập tiêu đề và từ khóa')
      return
    }
    createMutation.mutate({
      title: formTitle.trim(),
      targetKeyword: formKeyword.trim(),
      projectId,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/projects" className="hover:text-slate-700 transition-colors">
          Dự án
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-medium">{project?.name || '...'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bài viết</h1>
          <p className="text-slate-500 text-sm mt-1">
            {articles.length} bài viết trong dự án này
          </p>
        </div>

        <TooltipProvider>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span wrapper lets tooltip fire even when button is disabled */}
                <span tabIndex={isQuotaExhausted ? 0 : undefined} className="inline-flex">
                  <DialogTrigger asChild>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                      disabled={isQuotaExhausted}
                      onClick={isQuotaExhausted ? (e) => e.preventDefault() : undefined}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Tạo bài viết mới
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>
              {isQuotaExhausted && (
                <TooltipContent>
                  Hết quota tháng này — Nâng cấp
                </TooltipContent>
              )}
            </Tooltip>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Tạo bài viết mới</DialogTitle>
              <DialogDescription>
                Nhập tiêu đề và từ khóa mục tiêu cho bài viết SEO
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="article-title" className="text-[13px] font-semibold">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="article-title"
                  placeholder="VD: Cách viết content SEO hiệu quả 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={createMutation.isPending}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="article-keyword" className="text-[13px] font-semibold">
                  Từ khóa mục tiêu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="article-keyword"
                    placeholder="VD: viết content SEO"
                    value={formKeyword}
                    onChange={(e) => setFormKeyword(e.target.value)}
                    disabled={createMutation.isPending}
                    required
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-400">Từ khóa chính bạn muốn tối ưu cho bài viết</p>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsDialogOpen(false); resetForm() }}
                  disabled={createMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo bài viết'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </TooltipProvider>
      </div>

      {/* Articles list */}
      {articles.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Chưa có bài viết nào</h3>
          <p className="text-slate-500 text-sm mb-4">
            Bắt đầu tạo bài viết SEO đầu tiên cho dự án này
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isQuotaExhausted ? 0 : undefined} className="inline-flex">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isQuotaExhausted}
                    onClick={() => { if (!isQuotaExhausted) setIsDialogOpen(true) }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
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
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Từ khóa
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Điểm SEO
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Cập nhật
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => {
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
                          {article.targetKeyword ? (
                            <span className="text-[13px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {article.targetKeyword}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {article.seoScore != null ? (
                            <span
                              className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${getSeoScoreColor(article.seoScore)} ${getSeoScoreBg(article.seoScore)}`}
                            >
                              {article.seoScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[13px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[13px]">{updatedDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/articles/${article.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-blue-600 hover:text-blue-700 text-xs"
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Mở editor
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                              onClick={() => setDeleteConfirmId(article.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bài viết</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa bài viết'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

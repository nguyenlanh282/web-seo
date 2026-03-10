'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  FolderOpen,
  ArrowRight,
  Trash2,
  Globe,
  Loader2,
} from 'lucide-react'
import { PlanLimitBanner } from '@/components/plan-limits'

interface Project {
  id: string
  name: string
  domain?: string
  language: string
  _count?: { articles: number }
  createdAt: string
}

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDomain, setFormDomain] = useState('')
  const [formLanguage, setFormLanguage] = useState('vi')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Tạo dự án thành công!')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Tạo dự án thất bại')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDeleteConfirmId(null)
      toast.success('Đã xóa dự án')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Xóa dự án thất bại')
    },
  })

  const resetForm = () => {
    setFormName('')
    setFormDomain('')
    setFormLanguage('vi')
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Vui lòng nhập tên dự án')
      return
    }
    createMutation.mutate({
      name: formName.trim(),
      domain: formDomain.trim() || undefined,
      language: formLanguage,
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
      {/* Plan Limit Banner */}
      <PlanLimitBanner type="project" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dự án</h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý các dự án SEO của bạn
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Tạo dự án mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Tạo dự án mới</DialogTitle>
              <DialogDescription>
                Tạo dự án để tổ chức các bài viết SEO của bạn
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-[13px] font-semibold">
                  Tên dự án <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project-name"
                  placeholder="VD: Blog Marketing 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={createMutation.isPending}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-domain" className="text-[13px] font-semibold">
                  Domain
                </Label>
                <Input
                  id="project-domain"
                  placeholder="VD: blog.example.com"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  disabled={createMutation.isPending}
                />
                <p className="text-xs text-slate-400">Domain website để tối ưu SEO (không bắt buộc)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">Ngôn ngữ</Label>
                <Select value={formLanguage} onValueChange={setFormLanguage} disabled={createMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngôn ngữ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
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
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo dự án'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects grid */}
      {(projects as Project[]).length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Chưa có dự án nào</h3>
          <p className="text-slate-500 text-sm mb-4">
            Tạo dự án đầu tiên để bắt đầu viết content SEO
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tạo dự án
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as Project[]).map((project) => (
            <Card
              key={project.id}
              className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmId(project.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{project.name}</h3>

                {project.domain && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{project.domain}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {project._count?.articles ?? 0} bài viết
                  </span>
                  <Link
                    href={`/projects/${project.id}/articles`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Xem bài viết
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa dự án</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa dự án này? Hành động này không thể hoàn tác và tất cả bài viết trong dự án sẽ bị xóa.
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
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa dự án'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

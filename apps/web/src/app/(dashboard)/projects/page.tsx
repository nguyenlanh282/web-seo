'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, FolderOpen, Loader2 } from 'lucide-react'
import { PlanLimitBanner } from '@/components/plan-limits'
import { ProjectCard } from './project-card'
import { CreateProjectDialog } from './create-project-dialog'
import { DeleteProjectDialog } from './delete-project-dialog'

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-nb-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PlanLimitBanner type="project" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[#0D0D0D]"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            Dự án
          </h1>
          <p className="text-[#0D0D0D]/60 text-sm mt-1">Quản lý các dự án SEO của bạn</p>
        </div>

        <CreateProjectDialog
          isPending={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      </div>

      {/* Projects grid */}
      {(projects as Project[]).length === 0 ? (
        <div className="nb-card-static bg-nb-bg py-16 flex flex-col items-center gap-3">
          <FolderOpen className="h-12 w-12 text-[#0D0D0D]/30" />
          <h3 className="text-lg font-semibold text-[#0D0D0D]">Chưa có dự án nào</h3>
          <p className="text-[#0D0D0D]/60 text-sm">
            Tạo dự án đầu tiên để bắt đầu viết content SEO
          </p>
          <CreateProjectDialog
            isPending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as Project[]).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleteClick={setDeleteConfirmId}
            />
          ))}
        </div>
      )}

      <DeleteProjectDialog
        open={!!deleteConfirmId}
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId) }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  )
}

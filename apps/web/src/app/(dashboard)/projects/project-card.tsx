'use client'

import Link from 'next/link'
import { ArrowRight, Globe, Trash2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  domain?: string
  language: string
  _count?: { articles: number }
  createdAt: string
}

interface ProjectCardProps {
  project: Project
  onDeleteClick: (id: string) => void
}

export function ProjectCard({ project, onDeleteClick }: ProjectCardProps) {
  return (
    <div className="nb-card p-5 bg-white flex flex-col gap-3 cursor-pointer group">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg bg-nb-yellow border-[2px] border-black flex items-center justify-center font-bold text-[#0D0D0D]"
          style={{ boxShadow: '2px 2px 0 #000' }}
        >
          {project.name.charAt(0).toUpperCase()}
        </div>
        <button
          className="nb-btn p-1.5 bg-nb-red text-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteClick(project.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <h3 className="font-semibold text-[#0D0D0D] line-clamp-1">{project.name}</h3>

      {project.domain && (
        <div className="flex items-center gap-1.5 text-xs text-[#0D0D0D]/50">
          <Globe className="h-3 w-3" />
          <span className="truncate">{project.domain}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t-[2px] border-black/10">
        <span className="text-xs text-[#0D0D0D]/50">
          {project._count?.articles ?? 0} bài viết
        </span>
        <Link
          href={`/projects/${project.id}/articles`}
          className="nb-btn px-3 py-1 text-xs bg-nb-primary text-white flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          Xem bài viết
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

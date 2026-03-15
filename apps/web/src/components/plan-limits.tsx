'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { UpgradeModal } from '@/components/upgrade-modal'
import { AlertTriangle, ArrowUpRight, FileText, FolderOpen, Sparkles } from 'lucide-react'

// ============================================================================
// Credit Counter (for header/sidebar)
// ============================================================================

export function CreditCounter() {
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.stats(),
    refetchInterval: 30000, // refresh every 30s
  })

  const used = stats?.articlesUsedMonth || stats?.articlesUsed || 0
  const limit = stats?.articlesLimit || 30
  const remaining = Math.max(0, limit - used)
  const percent = limit > 0 ? Math.round((used / limit) * 100) : 0

  const isLow = percent >= 80
  const isExhausted = remaining <= 0

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase font-semibold text-[#0D0D0D]/50 tracking-wider">
          Bài viết tháng này
        </span>
        <span
          className={`text-xs font-bold ${
            isExhausted ? 'text-nb-red' : isLow ? 'text-nb-cta' : 'text-[#0D0D0D]'
          }`}
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          {used}/{limit}
        </span>
      </div>
      <div className="h-2 bg-black/20 rounded-full border border-black overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isExhausted ? 'bg-nb-red' : 'bg-nb-primary'}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {isExhausted && (
        <Link
          href="/pricing"
          className="flex items-center gap-1 mt-1.5 text-[10px] text-nb-red font-bold"
        >
          <Sparkles className="h-3 w-3" />
          Nâng cấp để tạo thêm
          <ArrowUpRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  )
}

// ============================================================================
// Plan Limit Banner
// ============================================================================

interface PlanLimitBannerProps {
  type: 'article' | 'project'
  className?: string
}

export function PlanLimitBanner({ type, className = '' }: PlanLimitBannerProps) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const { user } = useAuth()
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.stats(),
  })

  if (!stats) return null

  const isArticle = type === 'article'
  const used = isArticle ? (stats.articlesUsedMonth || stats.articlesUsed || 0) : (stats.totalProjects || 0)
  const limit = isArticle ? (stats.articlesLimit || 30) : (stats.projectsLimit || 2)
  const remaining = Math.max(0, limit - used)
  const percent = limit > 0 ? Math.round((used / limit) * 100) : 0

  // Don't show banner if under 70% usage
  if (percent < 70) return null

  const isExhausted = remaining <= 0
  const Icon = isArticle ? FileText : FolderOpen

  return (
    <>
      <div
        className={`nb-card-static px-4 py-3 flex items-center gap-3 ${
          isExhausted ? 'bg-nb-red' : 'bg-nb-yellow'
        } ${className}`}
      >
        <div className="rounded-lg border-[2px] border-black p-1.5 bg-white/30">
          {isExhausted ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${isExhausted ? 'text-white' : 'text-[#0D0D0D]'}`}>
            {isExhausted
              ? `Đã hết ${isArticle ? 'lượt tạo bài viết' : 'số dự án'} tháng này`
              : `Còn ${remaining} ${isArticle ? 'bài viết' : 'dự án'} (${used}/${limit})`}
          </p>
          <p className={`text-xs mt-0.5 ${isExhausted ? 'text-white/80' : 'text-[#0D0D0D]/70'}`}>
            {isExhausted
              ? 'Nâng cấp gói để tiếp tục sử dụng.'
              : `Bạn đang dùng ${percent}% giới hạn gói ${user?.plan || 'Starter'}.`}
          </p>
        </div>
        <button
          className={`nb-btn px-3 py-1.5 text-xs flex items-center gap-1 ${
            isExhausted
              ? 'bg-white text-[#0D0D0D]'
              : 'bg-[#0D0D0D] text-white'
          }`}
          onClick={() => setShowUpgrade(true)}
        >
          <Sparkles className="h-3 w-3" />
          Nâng cấp
        </button>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={user?.plan}
        reason={
          isExhausted
            ? `Bạn đã sử dụng hết ${isArticle ? 'bài viết' : 'dự án'} trong gói ${user?.plan || 'Starter'}.`
            : undefined
        }
      />
    </>
  )
}

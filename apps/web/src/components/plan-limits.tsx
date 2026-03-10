'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UpgradeModal } from '@/components/upgrade-modal'
import { AlertTriangle, ArrowUpRight, FileText, FolderOpen, Sparkles } from 'lucide-react'

// ============================================================================
// Credit Counter (for header/sidebar)
// ============================================================================

export function CreditCounter() {
  const { user } = useAuth()
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
        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
          Bài viết tháng này
        </span>
        <span className={`text-xs font-bold ${
          isExhausted ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-700'
        }`}>
          {used}/{limit}
        </span>
      </div>
      <Progress
        value={percent}
        className="h-1.5"
        indicatorClassName={
          isExhausted ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-blue-500'
        }
      />
      {isExhausted && (
        <Link
          href="/pricing"
          className="flex items-center gap-1 mt-1.5 text-[10px] text-red-500 hover:text-red-600 font-medium"
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          isExhausted
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        } ${className}`}
      >
        <div className={`p-1.5 rounded-md ${isExhausted ? 'bg-red-100' : 'bg-amber-100'}`}>
          {isExhausted ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isExhausted
              ? `Đã hết ${isArticle ? 'lượt tạo bài viết' : 'số dự án'} tháng này`
              : `Còn ${remaining} ${isArticle ? 'bài viết' : 'dự án'} (${used}/${limit})`}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {isExhausted
              ? 'Nâng cấp gói để tiếp tục sử dụng.'
              : `Bạn đang dùng ${percent}% giới hạn gói ${user?.plan || 'Starter'}.`}
          </p>
        </div>
        <Button
          size="sm"
          variant={isExhausted ? 'default' : 'outline'}
          className={isExhausted ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          onClick={() => setShowUpgrade(true)}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Nâng cấp
        </Button>
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

'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { usersApi, articlesApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { UserGrowthChart } from '@/components/dashboard/user-growth-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DataTable } from '@/components/dashboard/data-table'
import { DashboardWelcomeBanner } from '@/components/dashboard/welcome-banner'
import { RecentArticlesSection } from '@/components/dashboard/recent-articles-section'
import {
  FileText,
  CheckCircle2,
  TrendingUp,
  Zap,
  Loader2,
} from 'lucide-react'

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

  if (statsLoading || articlesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="nb-card p-6 flex flex-col items-center gap-3 bg-nb-bg">
          <Loader2 className="h-8 w-8 animate-spin text-nb-primary" aria-label="Loading dashboard" />
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--nb-font-heading)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  const totalArticles    = stats?.totalArticles    ?? 0
  const publishedArticles = stats?.publishedArticles ?? 0
  const avgSeoScore      = stats?.avgSeoScore      ?? 0
  const articlesLimit    = stats?.articlesLimit    ?? 30
  const articlesUsed     = stats?.articlesUsed     ?? 0
  const quotaPercent     = articlesLimit > 0 ? Math.round((articlesUsed / articlesLimit) * 100) : 0

  const kpiCards = [
    {
      title: 'Total Articles',
      value: totalArticles,
      trend: 12,
      icon: FileText,
      accentColor: 'bg-nb-yellow',
    },
    {
      title: 'Published',
      value: publishedArticles,
      trend: 8,
      icon: CheckCircle2,
      accentColor: 'bg-green-300',
    },
    {
      title: 'Avg SEO Score',
      value: avgSeoScore,
      trend: avgSeoScore > 70 ? 5 : -3,
      icon: TrendingUp,
      accentColor: 'bg-nb-primary',
      suffix: '/100',
    },
    {
      title: 'Quota Used',
      value: `${articlesUsed}/${articlesLimit}`,
      trend: -(100 - quotaPercent),
      trendLabel: 'remaining',
      icon: Zap,
      accentColor: quotaPercent >= 80 ? 'bg-nb-red' : 'bg-nb-cta',
    },
  ]

  const recentArticles = Array.isArray(articlesData) ? articlesData : []

  return (
    <div className="space-y-5" style={{ fontFamily: 'var(--nb-font-body)' }}>

      {/* Welcome banner */}
      <DashboardWelcomeBanner
        userName={user?.name}
        articlesUsed={articlesUsed}
        articlesLimit={articlesLimit}
        quotaPercent={quotaPercent}
      />

      {/* KPI Cards — 4 columns */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <KpiCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* Charts row */}
      <section aria-label="Analytics charts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueChart />
          <UserGrowthChart />
        </div>
      </section>

      {/* Activity feed + Transaction table */}
      <section aria-label="Activity and transactions">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
          <div className="lg:col-span-2">
            <DataTable />
          </div>
        </div>
      </section>

      {/* Recent articles (real data) */}
      <section aria-label="Recent articles">
        <RecentArticlesSection
          articles={recentArticles}
          articlesUsed={articlesUsed}
          articlesLimit={articlesLimit}
        />
      </section>

    </div>
  )
}

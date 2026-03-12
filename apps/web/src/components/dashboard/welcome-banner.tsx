'use client'

import Link from 'next/link'
import { Plus, Zap } from 'lucide-react'

interface WelcomeBannerProps {
  userName?: string
  articlesUsed: number
  articlesLimit: number
  quotaPercent: number
}

export function DashboardWelcomeBanner({
  userName,
  articlesUsed,
  articlesLimit,
  quotaPercent,
}: WelcomeBannerProps) {
  const isNearLimit = quotaPercent >= 80

  return (
    <div
      className="rounded-lg border-[3px] border-black p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        backgroundColor: '#FFEB3B',
        boxShadow: '5px 5px 0 #000',
        fontFamily: 'var(--nb-font-body)',
      }}
    >
      {/* Text block */}
      <div className="flex-1 min-w-0">
        <h1
          className="text-xl font-bold text-[#0D0D0D] leading-tight"
          style={{ fontFamily: 'var(--nb-font-heading)' }}
        >
          Hey{userName ? `, ${userName}` : ''}!
        </h1>
        <p className="text-sm font-semibold text-[#0D0D0D]/70 mt-0.5">
          {articlesLimit - articlesUsed} of {articlesLimit} articles left this month
        </p>

        {/* Quota bar */}
        <div className="mt-3 flex items-center gap-2 max-w-xs">
          <div className="flex-1 h-2.5 bg-black/20 rounded-full border border-black overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isNearLimit ? 'bg-nb-red' : 'bg-nb-primary'
              }`}
              style={{ width: `${quotaPercent}%` }}
              role="progressbar"
              aria-valuenow={quotaPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Quota used: ${quotaPercent}%`}
            />
          </div>
          <span className="text-xs font-bold font-mono">{quotaPercent}%</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/projects">
          <button
            className="nb-btn px-4 py-2 bg-[#0D0D0D] text-white text-sm flex items-center gap-1.5"
            style={{ fontFamily: 'var(--nb-font-heading)' }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Article
          </button>
        </Link>
        {isNearLimit && (
          <Link href="/pricing">
            <button
              className="nb-btn px-4 py-2 bg-nb-red text-white text-sm flex items-center gap-1.5"
              style={{ fontFamily: 'var(--nb-font-heading)' }}
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              Upgrade
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

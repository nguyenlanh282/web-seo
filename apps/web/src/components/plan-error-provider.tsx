'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { onPlanError } from '@/lib/api'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook that listens for 403/429 errors and shows appropriate UI.
 * Place once in the dashboard layout.
 */
export function PlanErrorProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')

  useEffect(() => {
    const unsubscribe = onPlanError((error) => {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = error.retryAfter || 60
        toast.error(error.message, {
          description: `Thử lại sau ${retryAfter} giây.`,
          duration: retryAfter * 1000,
        })
      } else if (
        error.code === 'CREDIT_EXHAUSTED' ||
        error.code === 'PROJECT_LIMIT_REACHED' ||
        error.code === 'WP_SITE_LIMIT_REACHED'
      ) {
        setUpgradeReason(error.message)
        setUpgradeOpen(true)
      } else {
        toast.error(error.message)
      }
    })

    return unsubscribe
  }, [])

  return (
    <>
      {children}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={user?.plan}
        reason={upgradeReason}
      />
    </>
  )
}

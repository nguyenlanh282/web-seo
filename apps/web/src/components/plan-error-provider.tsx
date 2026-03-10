'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { onPlanError } from '@/lib/api'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useAuth } from '@/lib/auth-context'
import { track } from '@/lib/analytics'

/**
 * Listens for 403/429 errors from the API and surfaces them as:
 * - Rate limit: toast with live countdown timer
 * - Plan limit: UpgradeModal
 *
 * Mount once in the dashboard layout.
 */
export function PlanErrorProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')

  // Track active rate-limit countdowns so we can update their toasts
  const countdownsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const startCountdown = useCallback((toastId: string | number, seconds: number) => {
    // Clear any existing interval for this toast
    const existing = countdownsRef.current.get(String(toastId))
    if (existing) clearInterval(existing)

    let remaining = seconds
    const interval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(interval)
        countdownsRef.current.delete(String(toastId))
        toast.dismiss(toastId)
      } else {
        toast.error(`Quá giới hạn — thử lại sau ${remaining}s`, {
          id: toastId,
          duration: remaining * 1000,
        })
      }
    }, 1000)

    countdownsRef.current.set(String(toastId), interval)
  }, [])

  useEffect(() => {
    const unsubscribe = onPlanError((error) => {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = error.retryAfter ?? 60
        track('rate_limit_hit', { retryAfter })
        // Use a stable toast ID per scope so repeated hits update the same toast
        const toastId = `rate-limit-${error.code}`
        toast.error(`Quá giới hạn — thử lại sau ${retryAfter}s`, {
          id: toastId,
          duration: retryAfter * 1000,
        })
        startCountdown(toastId, retryAfter)
      } else if (
        error.code === 'CREDIT_EXHAUSTED' ||
        error.code === 'PROJECT_LIMIT_REACHED' ||
        error.code === 'WP_SITE_LIMIT_REACHED'
      ) {
        track('plan_limit_hit', { code: error.code, plan: user?.plan ?? 'UNKNOWN' })
        track('upgrade_modal_opened', { reason: error.message, currentPlan: user?.plan })
        setUpgradeReason(error.message)
        setUpgradeOpen(true)
      } else {
        toast.error(error.message)
      }
    })

    return () => {
      unsubscribe()
      // Clear all running countdown intervals on unmount
      countdownsRef.current.forEach((interval) => clearInterval(interval))
      countdownsRef.current.clear()
    }
  }, [startCountdown])

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

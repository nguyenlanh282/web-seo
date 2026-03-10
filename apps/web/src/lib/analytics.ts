/**
 * Analytics — thin wrapper around PostHog.
 *
 * Usage:
 *   import { track } from '@/lib/analytics'
 *   track('article_created', { keyword: 'seo tips' })
 *
 * Events are no-ops when NEXT_PUBLIC_POSTHOG_KEY is not set
 * (local dev without analytics config).
 */
import posthog from 'posthog-js'

// ─── Event catalog (keep exhaustive, add new events here) ──────────────────

export type AnalyticsEvent =
  | { name: 'article_created';         props: { keyword: string; projectId?: string } }
  | { name: 'step_completed';          props: { step: 1 | 2 | 3 | 4 | 5; articleId: string; keyword?: string } }
  | { name: 'article_published';       props: { articleId: string; wpSiteId: string; seoScore?: number } }
  | { name: 'article_retry_publish';   props: { articleId: string; wpSiteId?: string } }
  | { name: 'export_html';             props: { articleId: string; wordCount?: number; seoScore?: number } }
  | { name: 'ai_action';               props: { action: string; articleId: string } }
  | { name: 'plan_limit_hit';          props: { code: string; plan: string } }
  | { name: 'rate_limit_hit';          props: { scope?: string; retryAfter?: number } }
  | { name: 'upgrade_modal_opened';    props: { reason: string; currentPlan?: string } }
  | { name: 'upgrade_clicked';         props: { from: string; targetPlan?: string } }
  | { name: 'wp_site_added';           props: { userId: string } }

// ─── Core helpers ───────────────────────────────────────────────────────────

function isReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    // posthog-js sets __loaded after init completes
    (posthog as unknown as { __loaded?: boolean }).__loaded === true
  )
}

/**
 * Track a typed event. No-op when PostHog is not initialised.
 */
export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']): void {
  if (!isReady()) return
  posthog.capture(name, props as Record<string, unknown>)
}

/**
 * Identify the current user in PostHog.
 * Call after login / session restore.
 */
export function identifyUser(userId: string, traits?: { email?: string; plan?: string; name?: string }): void {
  if (!isReady()) return
  posthog.identify(userId, traits)
}

/**
 * Reset identity (call on logout).
 */
export function resetAnalytics(): void {
  if (!isReady()) return
  posthog.reset()
}

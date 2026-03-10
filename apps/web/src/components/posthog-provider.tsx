'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

/** Fires a PostHog pageview on every route change — must be inside Suspense */
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY) return
    posthog.capture('$pageview', { $current_url: window.location.href })
  }, [pathname, searchParams])

  return null
}

/** Initialises PostHog once on first client render and tracks pageviews */
function PostHogInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return
    if (posthog.__loaded) return // already initialised (e.g. HMR)

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,  // manual below
      capture_pageleave: true,
      autocapture: false,
      persistence: 'localStorage+cookie',
      respect_dnt: true,
      loaded(ph) {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  )
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    // Not configured — passthrough
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogInit>{children}</PostHogInit>
    </PHProvider>
  )
}

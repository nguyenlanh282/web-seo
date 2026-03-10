import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of traces in production — adjust as needed
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Capture 100% of replays for sessions that contain an error
  replaysOnErrorSampleRate: 1.0,

  // Capture 0% of regular replays (only error replays)
  replaysSessionSampleRate: 0,
})

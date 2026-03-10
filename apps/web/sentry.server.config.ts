import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // No client-side tracing on the server config
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
})

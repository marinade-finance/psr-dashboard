import * as Sentry from '@sentry/react'

// Opt-in: Sentry is only initialised when VITE_SENTRY_DSN is set at build
// time. Local/dev builds with no DSN skip init entirely, so the SDK is a
// no-op for every call below (captureException etc.).
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'production',
    release: import.meta.env.VITE_SENTRY_RELEASE,
    // Conservative defaults: surface errors and breadcrumbs without recording
    // every replay session. Adjust per-environment via Sentry project config.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  })
}

// Re-export the bits other modules need so the rest of the app imports from
// one place. When Sentry is uninitialised these still work — they're no-ops.
export { ErrorBoundary, captureException, captureMessage } from '@sentry/react'

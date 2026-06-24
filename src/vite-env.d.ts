/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VALIDATORS_API_URL?: string
  readonly VITE_VALIDATOR_BONDS_API_URL?: string
  readonly VITE_SCORING_API_URL?: string
  readonly VITE_NOTIFICATIONS_API_URL?: string
  readonly VITE_RPC_URL?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

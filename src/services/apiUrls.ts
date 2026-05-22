// API base URLs. Override at build/deploy time via VITE_* env vars; defaults
// hit Marinade production. Vite exposes only variables prefixed with VITE_ to
// the client bundle (see https://vite.dev/guide/env-and-mode).
export const VALIDATORS_API_URL =
  import.meta.env.VITE_VALIDATORS_API_URL ??
  'https://validators-api.marinade.finance'

export const VALIDATOR_BONDS_API_URL =
  import.meta.env.VITE_VALIDATOR_BONDS_API_URL ??
  'https://validator-bonds-api.marinade.finance'

export const SCORING_API_URL =
  import.meta.env.VITE_SCORING_API_URL ?? 'https://scoring.marinade.finance'

export const NOTIFICATIONS_API_URL =
  import.meta.env.VITE_NOTIFICATIONS_API_URL ??
  'https://marinade-notifications.marinade.finance'

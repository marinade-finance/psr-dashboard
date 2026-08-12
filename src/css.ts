export const CSS_PRIMARY = 'var(--primary)'
export const CSS_PRIMARY_LIGHT = 'var(--primary-light)'
export const CSS_PRIMARY_LIGHT_10 = 'var(--primary-light-10)'
export const CSS_DESTRUCTIVE = 'var(--destructive)'
export const CSS_DESTRUCTIVE_LIGHT = 'var(--destructive-light)'
export const CSS_WARNING = 'var(--warning)'
export const CSS_WARNING_LIGHT = 'var(--warning-light)'
export const CSS_INFO = 'var(--info)'
export const CSS_INFO_LIGHT = 'var(--info-light)'
export const CSS_MUTED = 'var(--muted)'
export const CSS_MUTED_FG = 'var(--muted-foreground)'
export const CSS_STATUS_GREEN = 'var(--status-green)'

// Ordinal rank ramp — for ranked share charts, where segments are ordered by
// magnitude rather than being distinct identities. Index by rank, not by
// entity. `CSS_RANK_OTHER` is the neutral for a folded remainder and sits
// deliberately outside the ramp: "Other" is not rank 6.
export const CSS_RANK = [
  'var(--rank-1)',
  'var(--rank-2)',
  'var(--rank-3)',
  'var(--rank-4)',
  'var(--rank-5)',
] as const
export const CSS_RANK_OTHER = 'var(--rank-other)'

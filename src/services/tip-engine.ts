import { apyBreakdown, assertNever } from '@marinade.finance/ds-sam-calc'

import {
  CSS_DESTRUCTIVE,
  CSS_DESTRUCTIVE_LIGHT,
  CSS_INFO,
  CSS_INFO_LIGHT,
  CSS_MUTED,
  CSS_MUTED_FG,
  CSS_PRIMARY,
  CSS_PRIMARY_LIGHT_10,
  CSS_WARNING,
  CSS_WARNING_LIGHT,
} from 'src/css'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { TipUrgency, ValidatorTip } from '@marinade.finance/ds-sam-calc'

// The CTA decision engine moved to @marinade.finance/ds-sam-calc; re-exported
// so existing imports from 'src/services/tip-engine' keep resolving. UI-only
// helpers (color/glyph/styling, APY view-model, delta cell) stay here.
export {
  getValidatorTip,
  bondAdvice,
  type ValidatorTip,
  type TipUrgency,
  type TipConstraint,
  type BondAdvice,
} from '@marinade.finance/ds-sam-calc'

export type TipIcon = 'alert' | 'bond' | 'bid' | 'cap' | 'up' | 'down' | 'right'

export interface TipStyle {
  color: string
  bg: string
}

// Color carries severity. Glyph carries the lever — except a critical
// alarm also swaps to the alert glyph; see getTipIcon.
export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case 'critical':
      return { color: CSS_DESTRUCTIVE, bg: CSS_DESTRUCTIVE_LIGHT }
    case 'warning':
      return { color: CSS_WARNING, bg: CSS_WARNING_LIGHT }
    case 'info':
      return { color: CSS_INFO, bg: CSS_INFO_LIGHT }
    case 'positive':
      return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10 }
    case 'neutral':
      return { color: CSS_MUTED_FG, bg: CSS_MUTED }
    default:
      return assertNever(urgency)
  }
}

// Glyph carries the tip's MEANING (which lever to pull). One exception:
// the single most-severe state — an estimated bond risk fee this epoch
// (tip.alert) — shows the alert glyph so the danger reads at a glance.
// Plain below-min / no-bond stay critical-red but keep their constraint
// glyph (no escalation). Otherwise a constraint maps to one fixed
// non-directional glyph; only constraint:'none' (in-set, the only lever
// left is the stake trajectory) gets a directional arrow, keyed off the
// real signed delta so it can never lie.
export const getTipIcon = (tip: ValidatorTip): TipIcon => {
  if (tip.alert) return 'alert'
  switch (tip.constraint) {
    case 'bond':
      return 'bond'
    case 'bid':
    case 'rank':
      return 'bid'
    case 'cap':
      return 'cap'
    case 'none':
      if (tip.delta > 0) return 'up'
      if (tip.delta < 0) return 'down'
      return 'right'
    default:
      return assertNever(tip.constraint)
  }
}

export type ApyBreakdownValue = {
  inflation: number
  mev: number
  blockRewards: number
  staticBid: number
  total: number
}

export const getApyBreakdown = (
  validator: AuctionValidator,
  epochsPerYear: number,
): ApyBreakdownValue => {
  const bd = apyBreakdown(validator, epochsPerYear)
  return {
    inflation: bd.inflation,
    mev: bd.mev,
    blockRewards: bd.blockRewards,
    staticBid: bd.bid,
    total: bd.total,
  }
}

// Used by sam-table's "Stake / Next Δ" cell. Sub-1-SOL deltas are neutral —
// they round to the same whole-SOL display and aren't actionable.
export type NextStakeDeltaTone = 'positive' | 'negative' | 'neutral'
export type NextStakeDeltaCell = {
  prefix: '+' | ''
  tone: NextStakeDeltaTone
}
export function nextStakeDeltaCell(expectedChange: number): NextStakeDeltaCell {
  if (Math.abs(expectedChange) < 1) return { prefix: '', tone: 'neutral' }
  if (expectedChange > 0) return { prefix: '+', tone: 'positive' }
  return { prefix: '', tone: 'negative' }
}

import { ICON_BID } from 'src/components/icons/icon-bid'
import { ICON_BOND } from 'src/components/icons/icon-bond'
import { ICON_DOWN } from 'src/components/icons/icon-down'
import { ICON_RANK } from 'src/components/icons/icon-rank'
import { ICON_RIGHT } from 'src/components/icons/icon-right'
import { ICON_UP } from 'src/components/icons/icon-up'
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
import { pay, stake, topUp } from 'src/format'

import { computeBondCoverage } from './bond-coverage'
import { bondHealthFromAuction } from './bond-health'
import { bondUtilizationPct, apyBreakdown } from './calculations'

import type { BondHealthState } from './bond-health'
import type { AugmentedAuctionValidator } from './sam'
import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type React from 'react'

export type TipUrgency =
  | 'critical'
  | 'warning'
  | 'info'
  | 'positive'
  | 'neutral'
export type TipConstraint = 'rank' | 'bond' | 'bid' | 'none'

export interface ValidatorTip {
  text: string
  urgency: TipUrgency
  constraint: TipConstraint
  // Signed next-epoch stake delta. Only meaningful when constraint === 'none';
  // that's the sole case whose glyph is allowed to be directional.
  delta: number
}

export interface TipStyle {
  color: string
  bg: string
}

export const getBondHealthStyle = (
  health: BondHealthState,
): { color: string; bg: string; label: string } => {
  if (health === 'critical') {
    return {
      color: CSS_DESTRUCTIVE,
      bg: CSS_DESTRUCTIVE_LIGHT,
      label: 'Critical',
    }
  }
  if (health === 'watch') {
    return { color: CSS_WARNING, bg: CSS_WARNING_LIGHT, label: 'Watch' }
  }
  if (health === 'soft') {
    return { color: CSS_INFO, bg: CSS_INFO_LIGHT, label: 'Soft' }
  }
  return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10, label: 'Healthy' }
}

// Color carries severity ONLY. Glyph never does — see getTipIcon.
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
    default:
      return { color: CSS_MUTED_FG, bg: CSS_MUTED }
  }
}

// Glyph carries the tip's MEANING (which lever to pull), never its severity.
// A constraint maps to one fixed non-directional glyph. Only constraint:'none'
// (the validator is in-set, the only lever left is the stake trajectory) gets
// a directional arrow, and it is keyed off the real signed delta so it can
// never lie — an up arrow appears iff stake is genuinely growing.
export const getTipIcon = (tip: ValidatorTip): React.ReactNode => {
  switch (tip.constraint) {
    case 'bond':
      return ICON_BOND
    case 'bid':
      return ICON_BID
    case 'rank':
      return ICON_RANK
    default:
      if (tip.delta > 0) return ICON_UP
      if (tip.delta < 0) return ICON_DOWN
      return ICON_RIGHT
  }
}

function outOfSetTip(
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  health: BondHealthState,
  delta: number,
): ValidatorTip {
  if (health !== 'healthy') {
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const topUpSol =
      coverage.topUpToIdealKeep > 0
        ? coverage.topUpToIdealKeep
        : coverage.topUpToKeepStake
    if (topUpSol > 0) {
      return {
        text: `Top up ${topUp(topUpSol)} to grow stake.`,
        urgency: 'warning',
        constraint: 'bond',
        delta,
      }
    }
  }
  // Bond below SDK's `minBondBalanceSol`: clipBondStakeCap returns 0 so the
  // validator can't win any stake regardless of bid. bond-health reports
  // 'healthy' here because runway against tiny stake is huge — that's a gap
  // in the runway-based diagnosis, surfaced here in the tip cascade.
  const bondBalance = validator.bondBalanceSol ?? 0
  if (bondBalance < dsSamConfig.minBondBalanceSol) {
    return {
      text: `Bond below minimum — ${stake(dsSamConfig.minBondBalanceSol)} required. Top up to qualify.`,
      urgency: 'warning',
      constraint: 'bond',
      delta,
    }
  }
  return {
    text: 'Bid too low. Raise it to qualify for stake.',
    urgency: 'warning',
    constraint: 'rank',
    delta,
  }
}

export const getValidatorTip = (
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): ValidatorTip => {
  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const delta = validator.values.expectedStakeChangeSol ?? 0
  const health = bondHealthFromAuction(validator, dsSamConfig, winningTotalPmpe)

  // Out-of-set validators: distinguish bid-too-low from bond-blocked.
  // A would-be winner whose bid clears the threshold but whose bond can't
  // back more stake gets the bond CTA, not the rank CTA.
  if (!inSet)
    return outOfSetTip(validator, dsSamConfig, winningTotalPmpe, health, delta)

  // Bond CTA cascade — priority: avoid fee > keep stake > ideal.
  if (health === 'critical' || health === 'watch' || health === 'soft') {
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0

    if (bondRiskFeeSol > 0 || coverage.topUpToAvoidFee > 0) {
      const feeStr =
        bondRiskFeeSol > 0
          ? `Estimated bond risk fee: ${pay(bondRiskFeeSol)}.`
          : 'Bond below penalty threshold.'
      const topUpStr =
        coverage.topUpToAvoidFee > 0
          ? ` Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the fee.`
          : ''
      return {
        text: `${feeStr}${topUpStr}`,
        urgency: 'critical',
        constraint: 'bond',
        delta,
      }
    }

    if (coverage.topUpToKeepStake > 0) {
      return {
        text: `Top up ${topUp(coverage.topUpToKeepStake)} to keep your stake.`,
        urgency: 'warning',
        constraint: 'bond',
        delta,
      }
    }

    // Soft is advisory only (lowest urgency, not a present danger). "Top up
    // to grow stake" would directly contradict a genuine positive delta —
    // stake is already arriving. The bond-coverage top-up sizes the bond vs
    // *current* exposed stake and is independent of the auction's
    // redelegation allocation that drives delta, so the two can disagree.
    // When stake is genuinely growing, the positive "arriving next epoch"
    // message wins; the Soft bond chip still surfaces independently.
    // (critical fee + watch keep-stake stay ahead of delta: the inflow does
    // not pay a fee nor refill the bond, so that advice is truthful even
    // while gaining.)
    if (coverage.topUpToIdealKeep > 0 && delta <= 0) {
      return {
        text: `Top up ${topUp(coverage.topUpToIdealKeep)} to grow stake.`,
        urgency: 'info',
        constraint: 'bond',
        delta,
      }
    }
  }

  if (delta > 0) {
    return {
      text: `${stake(delta)} arriving next epoch.`,
      urgency: 'positive',
      constraint: 'none',
      delta,
    }
  }

  if (delta === 0) {
    return {
      text: 'At target stake.',
      urgency: 'neutral',
      constraint: 'none',
      delta,
    }
  }

  return {
    text: `Losing ${stake(Math.abs(delta))} next epoch.`,
    urgency: 'warning',
    constraint: 'none',
    delta,
  }
}

export const calculateBondUtilization = (
  validator: AuctionValidator,
  minBondEpochs: number,
): number => bondUtilizationPct(validator, minBondEpochs)

export type ApyBreakdownValue = {
  inflation: number
  mev: number
  blockRewards: number
  stakeBid: number
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
    stakeBid: bd.bid,
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

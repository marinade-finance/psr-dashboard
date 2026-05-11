import React from 'react'

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
import { formatSolAmount, pay, payCta, stake, stakeCta } from 'src/format'

import { bondHealthFromAuction, computeBondCoverageMetrics } from './breakdowns'
import { bondUtilizationPct, compoundApy, apyBreakdown } from './calculations'

import type { BondHealthState } from './breakdowns'
import type { AugmentedAuctionValidator } from './sam'
import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

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
  icon?: React.ReactNode
}

export interface TipStyle {
  color: string
  bg: string
  icon: React.ReactNode
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

const ICON_CRITICAL = React.createElement(
  'svg',
  { viewBox: '0 0 12 12', width: 12, height: 12, fill: 'currentColor' },
  React.createElement('path', {
    d: 'M6 1L11.2 10H.8L6 1zm0 2L2.6 9h6.8L6 3zm-.5 2h1v2h-1V5zm0 2.5h1V9h-1V7.5z',
  }),
)

const ICON_UP = React.createElement(
  'svg',
  {
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M2 10L10 2M4 2h6v6' }),
)

const ICON_INFO = React.createElement(
  'svg',
  { viewBox: '0 0 12 12', width: 12, height: 12, fill: 'currentColor' },
  React.createElement('circle', { cx: 6, cy: 6, r: 5.25, opacity: 0.18 }),
  React.createElement('circle', { cx: 6, cy: 4, r: 0.75 }),
  React.createElement('rect', {
    x: 5.25,
    y: 5.5,
    width: 1.5,
    height: 3.5,
    rx: 0.5,
  }),
)

const ICON_CHECK = React.createElement(
  'svg',
  {
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M2 6l3 3 5-5' }),
)

const ICON_RIGHT = React.createElement(
  'svg',
  {
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M2 6h8M7 3l3 3-3 3' }),
)

const ICON_DOWN = React.createElement(
  'svg',
  {
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M2 2L10 10M10 4v6H4' }),
)

export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case 'critical':
      return {
        color: CSS_DESTRUCTIVE,
        bg: CSS_DESTRUCTIVE_LIGHT,
        icon: ICON_CRITICAL,
      }
    case 'warning':
      return { color: CSS_WARNING, bg: CSS_WARNING_LIGHT, icon: ICON_UP }
    case 'info':
      return { color: CSS_INFO, bg: CSS_INFO_LIGHT, icon: ICON_INFO }
    case 'positive':
      return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10, icon: ICON_CHECK }
    default:
      return { color: CSS_MUTED_FG, bg: CSS_MUTED, icon: ICON_RIGHT }
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
  if (!inSet) {
    if (health !== 'healthy') {
      const coverage = computeBondCoverageMetrics(
        validator,
        dsSamConfig.minBondEpochs,
        dsSamConfig.idealBondEpochs,
        winningTotalPmpe,
        dsSamConfig.bondRiskFeeMult,
      )
      const topUp =
        coverage.topUpToIdealKeep > 0
          ? coverage.topUpToIdealKeep
          : coverage.topUpToKeepStake
      if (topUp > 0) {
        return {
          text: `Bond too small for stake. Top up ${stakeCta(topUp)} to qualify for more.`,
          urgency: 'warning',
          constraint: 'bond',
        }
      }
    }
    return {
      text: 'Below the winning threshold. Raise your bid to qualify for Marinade stake.',
      urgency: 'warning',
      constraint: 'rank',
    }
  }

  // Bond CTA cascade — priority: avoid fee > keep stake > ideal.
  if (health === 'critical' || health === 'watch' || health === 'soft') {
    const coverage = computeBondCoverageMetrics(
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
          ? ` Top up ${payCta(coverage.topUpToAvoidFee)} to avoid the fee.`
          : ''
      return {
        text: `${feeStr}${topUpStr}`,
        urgency: 'critical',
        constraint: 'bond',
      }
    }

    if (coverage.topUpToKeepStake > 0) {
      return {
        text: `Top up ${payCta(coverage.topUpToKeepStake)} to keep your stake.`,
        urgency: 'warning',
        constraint: 'bond',
      }
    }

    if (coverage.topUpToIdealKeep > 0) {
      return {
        text: `Top up ${payCta(coverage.topUpToIdealKeep)} for more stake.`,
        urgency: 'info',
        constraint: 'bond',
      }
    }
  }

  if (delta > 0) {
    return {
      text: `${stake(delta)} arriving next epoch.`,
      urgency: 'positive',
      constraint: 'none',
      icon: ICON_UP,
    }
  }

  if (delta === 0) {
    return {
      text: 'At target stake.',
      urgency: 'neutral',
      constraint: 'none',
    }
  }

  return {
    text: `Losing ${stake(Math.abs(delta))} next epoch.`,
    urgency: 'warning',
    constraint: 'none',
    icon: ICON_DOWN,
  }
}

export const calculateBondUtilization = (
  validator: AuctionValidator,
  minBondEpochs: number,
): number => bondUtilizationPct(validator, minBondEpochs)

export const calculateMaxApy = (
  validator: AuctionValidator,
  epochsPerYear: number,
): number => compoundApy(validator.revShare.totalPmpe, epochsPerYear)

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

export const formatStakeDelta = (
  validator: AuctionValidator,
): { text: string; color: string; arrow: string } => {
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const samActive = validator.marinadeActivatedStakeSol
  const inSet = samTarget > 0

  if (!inSet) {
    return { text: '\u2014', color: CSS_MUTED_FG, arrow: '' }
  }

  const delta = samTarget - samActive

  if (delta > 0) {
    return {
      text: `+${formatSolAmount(delta, 0)}`,
      color: CSS_PRIMARY,
      arrow: '\u2191',
    }
  }
  if (delta < 0) {
    return {
      text: formatSolAmount(delta, 0),
      color: CSS_DESTRUCTIVE,
      arrow: '\u2193',
    }
  }
  return { text: '0', color: CSS_MUTED_FG, arrow: '\u2192' }
}

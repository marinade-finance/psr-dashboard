import { formatSolAmount, pay, payCta, stakeCta } from 'src/format'

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
  icon?: string
}

export interface TipStyle {
  color: string
  bg: string
  icon: string
}

// Single source of truth for bond CTA text. Used by getValidatorTip and
// bond-coverage.tsx's statusLine so both surfaces stay in sync.
//
// `payCta` is used for top-up amounts: when raw value is positive but rounds
// to "0.00 SOL" we surface "<0.01 SOL" instead so the call to action stays
// honest ("Top up 0.00 SOL to avoid the fee" reads as a no-op).
export function bondStatusText(
  topUpToAvoidFee: number,
  topUpToKeepStake: number,
  topUpToIdealKeep: number,
  bondRiskFeeSol: number,
): string {
  if (bondRiskFeeSol > 0 || topUpToAvoidFee > 0) {
    const feeStr =
      bondRiskFeeSol > 0
        ? `Estimated bond risk fee: ${pay(bondRiskFeeSol)}.`
        : 'Bond below penalty threshold.'
    const topUpStr =
      topUpToAvoidFee > 0
        ? ` Top up ${payCta(topUpToAvoidFee)} to avoid the fee.`
        : ''
    return `${feeStr}${topUpStr}`
  }
  if (topUpToKeepStake > 0)
    return `Top up ${payCta(topUpToKeepStake)} to keep your stake.`
  if (topUpToIdealKeep > 0)
    return `Top up ${payCta(topUpToIdealKeep)} for more stake.`
  return ''
}

const VAR_DESTRUCTIVE = 'var(--destructive)'
const VAR_WARNING = 'var(--warning)'
const VAR_MUTED_FG = 'var(--muted-foreground)'
const VAR_PRIMARY = 'var(--primary)'

export const getBondHealthStyle = (
  health: BondHealthState,
): { color: string; bg: string; label: string } => {
  if (health === 'critical') {
    return {
      color: VAR_DESTRUCTIVE,
      bg: 'var(--destructive-light)',
      label: 'Critical',
    }
  }
  if (health === 'watch') {
    return {
      color: VAR_WARNING,
      bg: 'var(--warning-light)',
      label: 'Watch',
    }
  }
  if (health === 'soft') {
    return {
      color: 'var(--info)',
      bg: 'var(--info-light)',
      label: 'Soft',
    }
  }
  return {
    color: VAR_PRIMARY,
    bg: 'var(--primary-light-10)',
    label: 'Healthy',
  }
}

export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case 'critical':
      return {
        color: VAR_DESTRUCTIVE,
        bg: 'var(--destructive-light)',
        icon: '\u26A0',
      }
    case 'warning':
      return {
        color: VAR_WARNING,
        bg: 'var(--warning-light)',
        icon: '\u2197',
      }
    case 'info':
      return {
        color: 'var(--info)',
        bg: 'var(--info-light)',
        icon: '\uD83D\uDCA1',
      }
    case 'positive':
      return {
        color: VAR_PRIMARY,
        bg: 'var(--primary-light-10)',
        icon: '\u2713',
      }
    default:
      return {
        color: VAR_MUTED_FG,
        bg: 'var(--muted)',
        icon: '\u2192',
      }
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
      const m = computeBondCoverageMetrics(
        validator,
        dsSamConfig.minBondEpochs,
        dsSamConfig.idealBondEpochs,
        winningTotalPmpe,
        dsSamConfig.bondRiskFeeMult,
      )
      const topUp =
        m.topUpToIdealKeep > 0 ? m.topUpToIdealKeep : m.topUpToKeepStake
      if (topUp > 0) {
        return {
          text: `Bond too small for stake. Top up ${stakeCta(topUp)} to qualify for more.`,
          urgency: 'warning',
          constraint: 'bond',
        }
      }
    }
    return {
      text: 'Below the winning threshold.',
      urgency: 'warning',
      constraint: 'rank',
    }
  }

  // Bond CTA cascade — priority: avoid fee > keep stake > ideal.
  if (health === 'critical' || health === 'watch' || health === 'soft') {
    const m = computeBondCoverageMetrics(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0

    if (bondRiskFeeSol > 0 || m.topUpToAvoidFee > 0) {
      return {
        text: bondStatusText(m.topUpToAvoidFee, 0, 0, bondRiskFeeSol),
        urgency: 'critical',
        constraint: 'bond',
      }
    }

    if (m.topUpToKeepStake > 0) {
      return {
        text: bondStatusText(0, m.topUpToKeepStake, 0, 0),
        urgency: 'warning',
        constraint: 'bond',
      }
    }

    if (m.topUpToIdealKeep > 0) {
      return {
        text: bondStatusText(0, 0, m.topUpToIdealKeep, 0),
        urgency: 'info',
        constraint: 'bond',
      }
    }
  }

  if (delta > 0) {
    return {
      text: `${pay(delta)} arriving next epoch.`,
      urgency: 'positive',
      constraint: 'none',
      icon: '↗',
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
    text: `Losing ${pay(Math.abs(delta))} next epoch.`,
    urgency: 'warning',
    constraint: 'none',
    icon: '↘',
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

export type ApyBreakdownDisplay = {
  inflation: number
  mev: number
  blockRewards: number
  stakeBid: number
  total: number
}

export const getApyBreakdown = (
  validator: AuctionValidator,
  epochsPerYear: number,
): ApyBreakdownDisplay => {
  const bd = apyBreakdown(validator, epochsPerYear)
  return {
    inflation: bd.inflation,
    mev: bd.mev,
    blockRewards: bd.blockRewards,
    stakeBid: bd.bid,
    total: bd.total,
  }
}

// Used by sam-table's "Stake / Next Δ" cell. Anything that displays as 0 SOL
// (|delta| < 0.5) is muted/neutral — printing "-0 SOL" in red was misleading.
export type NextStakeDeltaTone = 'positive' | 'negative' | 'neutral'
export type NextStakeDeltaCell = {
  prefix: '+' | ''
  tone: NextStakeDeltaTone
}
export function nextStakeDeltaCell(expectedChange: number): NextStakeDeltaCell {
  if (Math.abs(expectedChange) < 0.5) return { prefix: '', tone: 'neutral' }
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
    return { text: '\u2014', color: VAR_MUTED_FG, arrow: '' }
  }

  const delta = samTarget - samActive

  if (delta > 0) {
    return {
      text: `+${formatSolAmount(delta, 0)}`,
      color: VAR_PRIMARY,
      arrow: '\u2191',
    }
  }
  if (delta < 0) {
    return {
      text: formatSolAmount(delta, 0),
      color: VAR_DESTRUCTIVE,
      arrow: '\u2193',
    }
  }
  return { text: '0', color: VAR_MUTED_FG, arrow: '\u2192' }
}

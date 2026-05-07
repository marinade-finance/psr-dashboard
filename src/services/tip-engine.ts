import { formatSolAmount } from 'src/format'

import { bondHealthFromAuction, computeBondCoverageMetrics } from './breakdowns'
import { bondUtilizationPct, compoundApy, apyBreakdown } from './calculations'

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
}

export interface TipStyle {
  color: string
  bg: string
  icon: string
}

const VAR_DESTRUCTIVE = 'var(--destructive)'
const VAR_WARNING = 'var(--warning)'
const VAR_MUTED_FG = 'var(--muted-foreground)'
const VAR_PRIMARY = 'var(--primary)'

export const getBondHealthStyle = (
  health: 'healthy' | 'watch' | 'critical',
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
  const bondGoodForEpochs = validator.bondGoodForNEpochs ?? 0
  const health = bondHealthFromAuction(validator, dsSamConfig, winningTotalPmpe)

  if (!inSet) {
    return {
      text: 'Out of auction — raise bid or cut commission.',
      urgency: 'warning',
      constraint: 'rank',
    }
  }

  if (health === 'critical') {
    const bondCoverage = computeBondCoverageMetrics(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const topUpStr =
      bondCoverage.topUpToMin > 0
        ? ` Top up ${formatSolAmount(bondCoverage.topUpToMin, 0)} SOL.`
        : ''
    if (bondGoodForEpochs <= 0) {
      return {
        text: `Bond depleted — top up now.${topUpStr}`,
        urgency: 'critical',
        constraint: 'bond',
      }
    }
    if (bondGoodForEpochs <= 5) {
      const epochs = Math.round(bondGoodForEpochs)
      return {
        text: `Bond depletes in ${epochs} epoch${epochs === 1 ? '' : 's'} — top up.${topUpStr}`,
        urgency: 'critical',
        constraint: 'bond',
      }
    }
    return {
      text: `Bond below minimum — bid penalty active.${topUpStr}`,
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'watch') {
    const bondCoverage = computeBondCoverageMetrics(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const topUpStr =
      bondCoverage.topUpToIdeal > 0
        ? ` Top up ${formatSolAmount(bondCoverage.topUpToIdeal, 0)} SOL to receive more stake.`
        : ''
    return {
      text: `Bond runway ${Math.round(bondGoodForEpochs)} epochs.${topUpStr}`,
      urgency: 'warning',
      constraint: 'bond',
    }
  }

  if (delta > 0) {
    return {
      text: `${Math.round(delta).toLocaleString()} SOL arriving next epoch.`,
      urgency: 'positive',
      constraint: 'none',
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
    text: `Losing ${Math.round(Math.abs(delta)).toLocaleString()} SOL next epoch.`,
    urgency: 'warning',
    constraint: 'none',
  }
}

export const calculateBondUtilization = (validator: AuctionValidator): number =>
  bondUtilizationPct(validator)

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

export const formatStakeDelta = (
  validator: AuctionValidator,
): { text: string; color: string; arrow: string } => {
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const samActive = validator.marinadeActivatedStakeSol
  const inSet = samTarget > 0

  if (!inSet) {
    return { text: '\u2014', color: VAR_MUTED_FG, arrow: '' }
  }

  const delta = Math.round(samTarget - samActive)

  if (delta > 0) {
    return {
      text: `+${delta.toLocaleString()}`,
      color: VAR_PRIMARY,
      arrow: '\u2191',
    }
  }
  if (delta < 0) {
    return {
      text: delta.toLocaleString(),
      color: VAR_DESTRUCTIVE,
      arrow: '\u2193',
    }
  }
  return { text: '0', color: VAR_MUTED_FG, arrow: '\u2192' }
}

import { bondHealthFromAuction } from './breakdowns'
import { bondUtilizationPct, compoundApy, apyBreakdown } from './calculations'

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
  validator: AuctionValidator,
  winningApy: number,
  epochsPerYear: number,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): ValidatorTip => {
  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const samActive = validator.marinadeActivatedStakeSol
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const delta = samTarget - samActive
  const bondGoodForEpochs = validator.bondGoodForNEpochs ?? 0
  const health = bondHealthFromAuction(validator, dsSamConfig, winningTotalPmpe)
  const maxApy = calculateMaxApy(validator, epochsPerYear)
  const bidPmpe = validator.revShare.bidPmpe

  if (!inSet) {
    const gap = (winningApy - maxApy).toFixed(2)
    return {
      text: `Not in winning set — raise bid by ~${gap}% or lower commission.`,
      urgency: 'critical',
      constraint: 'rank',
    }
  }

  if (health === 'critical') {
    if (bondGoodForEpochs <= 0) {
      return {
        text: 'Bond depleted — top up now.',
        urgency: 'critical',
        constraint: 'bond',
      }
    }
    if (bondGoodForEpochs <= 5) {
      const epochsRounded = Math.round(bondGoodForEpochs)
      return {
        text: `Bond depletes in ${epochsRounded} epoch${epochsRounded === 1 ? '' : 's'} — top up.`,
        urgency: 'critical',
        constraint: 'bond',
      }
    }
    return {
      text: 'Bond below minimum coverage — top up.',
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'watch' && bidPmpe < 15) {
    return {
      text: `Bid ${(bidPmpe / 10).toFixed(2)}% is below median — raise to 0.15–0.25%.`,
      urgency: 'warning',
      constraint: 'bid',
    }
  }

  if (health === 'watch') {
    return {
      text: `Bond runway ${Math.round(bondGoodForEpochs)} epochs — consider topping up.`,
      urgency: 'warning',
      constraint: 'bond',
    }
  }

  if (bidPmpe < 10 && delta > 50000) {
    return {
      text: `Bid under 10 PMPE — raising could add ~${(delta / 1000).toFixed(0)}K SOL stake.`,
      urgency: 'info',
      constraint: 'bid',
    }
  }

  if (delta > 100000) {
    return {
      text: `+${(delta / 1000).toFixed(0)}K SOL incoming next epoch.`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta > 0) {
    const runwayNote =
      bondGoodForEpochs > 20 ? 'Strong runway.' : 'Monitor bond.'
    return {
      text: `+${delta.toLocaleString()} SOL incoming. ${runwayNote}`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta === 0) {
    return {
      text: 'At target — raise bid to grow or reduce WANT to free bond.',
      urgency: 'neutral',
      constraint: 'none',
    }
  }

  return {
    text: `Losing ${Math.abs(delta).toLocaleString()} SOL — raise bid or check commission.`,
    urgency: 'critical',
    constraint: 'bid',
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

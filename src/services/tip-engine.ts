/** @new v2 */
import {
  getBondHealth,
  bondRunwayDays,
  bondUtilizationPct,
  compoundApy,
  apyBreakdown,
} from './calculations'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

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

export { getBondHealth }

const CLS_DESTRUCTIVE = 'text-destructive'
const CLS_DESTRUCTIVE_BG = 'bg-destructive/10'
const CLS_WARNING = 'text-warning'
const CLS_WARNING_BG = 'bg-warning/10'
const CLS_PRIMARY = 'text-primary'
const CLS_PRIMARY_BG = 'bg-primary/10'
const CLS_MUTED = 'text-muted-foreground'

export const getBondHealthStyle = (
  health: 'healthy' | 'watch' | 'critical',
): { color: string; bg: string; label: string } => {
  if (health === 'critical') {
    return {
      color: CLS_DESTRUCTIVE,
      bg: CLS_DESTRUCTIVE_BG,
      label: 'Critical',
    }
  }
  if (health === 'watch') {
    return {
      color: CLS_WARNING,
      bg: CLS_WARNING_BG,
      label: 'Watch',
    }
  }
  return {
    color: CLS_PRIMARY,
    bg: CLS_PRIMARY_BG,
    label: 'Healthy',
  }
}

export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case 'critical':
      return {
        color: CLS_DESTRUCTIVE,
        bg: CLS_DESTRUCTIVE_BG,
        icon: '\u26A0',
      }
    case 'warning':
      return {
        color: CLS_WARNING,
        bg: CLS_WARNING_BG,
        icon: '\u2197',
      }
    case 'info':
      return {
        color: 'text-info',
        bg: 'bg-info/10',
        icon: '\uD83D\uDCA1',
      }
    case 'positive':
      return {
        color: CLS_PRIMARY,
        bg: CLS_PRIMARY_BG,
        icon: '\u2713',
      }
    default:
      return {
        color: CLS_MUTED,
        bg: 'bg-muted',
        icon: '\u2192',
      }
  }
}

export const getValidatorTip = (
  validator: AuctionValidator,
  winningApy: number,
  epochsPerYear: number,
): ValidatorTip => {
  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const samActive = validator.marinadeActivatedStakeSol
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const delta = samTarget - samActive
  const bondGoodForEpochs = validator.bondGoodForNEpochs ?? 0
  const bondUtilPct = calculateBondUtilization(validator)
  const health = getBondHealth(bondUtilPct, bondGoodForEpochs)
  const maxApy = calculateMaxApy(validator, epochsPerYear)
  const bidPmpe = validator.revShare.bidPmpe

  if (!inSet) {
    const gap = (winningApy - maxApy).toFixed(2)
    return {
      text: `Outside winning set. Increase bid by ~${gap}% or lower commission to qualify.`,
      urgency: 'critical',
      constraint: 'rank',
    }
  }

  if (health === 'critical' && bondGoodForEpochs <= 5) {
    const days = Math.round(bondRunwayDays(bondGoodForEpochs))
    return {
      text: `Bond depletes in ~${bondGoodForEpochs} epochs (${days}d). Top up to avoid forced unstaking.`,
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'critical') {
    return {
      text: 'Bond utilization >85%. Top up bond or reduce WANT to lower exposure.',
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'watch' && bidPmpe < 15) {
    // bidPmpe is in PMPE (per mille per epoch), divide by 10 to get percentage
    return {
      text: `Bid at ${(bidPmpe / 10).toFixed(2)}% is below median. Raise to 0.15-0.25% to gain rank.`,
      urgency: 'warning',
      constraint: 'bid',
    }
  }

  if (health === 'watch') {
    return {
      text: `Bond runway ~${bondGoodForEpochs} epochs. Consider topping up before next cycle.`,
      urgency: 'warning',
      constraint: 'bond',
    }
  }

  if (bidPmpe < 10 && delta > 50000) {
    return {
      text: `Low bid limits rank. Raising could gain ~${(delta / 1000).toFixed(0)}K SOL more stake.`,
      urgency: 'info',
      constraint: 'bid',
    }
  }

  if (delta > 100000) {
    return {
      text: `Gaining +${(delta / 1000).toFixed(0)}K SOL stake next epoch. Bond and bid well-positioned.`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta > 0) {
    const runwayNote =
      bondGoodForEpochs > 20 ? 'Strong runway.' : 'Monitor bond.'
    return {
      text: `On track: +${delta.toLocaleString()} SOL incoming. ${runwayNote}`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta === 0) {
    return {
      text: 'At target allocation. Raise bid to grow, or reduce WANT to free bond capacity.',
      urgency: 'neutral',
      constraint: 'none',
    }
  }

  return {
    text: `Losing ${Math.abs(delta).toLocaleString()} SOL stake. Raise bid or check if commission changed.`,
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

export const getApyBreakdown = (
  validator: AuctionValidator,
  epochsPerYear: number,
): {
  inflation: number
  mev: number
  blockRewards: number
  stakeBid: number
  total: number
} => {
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
    return { text: '\u2014', color: CLS_MUTED, arrow: '' }
  }

  const delta = Math.round(samTarget - samActive)

  if (delta > 0) {
    return {
      text: `+${delta.toLocaleString()}`,
      color: CLS_PRIMARY,
      arrow: '\u2191',
    }
  }
  if (delta < 0) {
    return {
      text: delta.toLocaleString(),
      color: CLS_DESTRUCTIVE,
      arrow: '\u2193',
    }
  }
  return { text: '0', color: CLS_MUTED, arrow: '\u2192' }
}

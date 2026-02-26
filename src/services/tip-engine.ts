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

const EPOCH_HOURS = 52

const VAR_DESTRUCTIVE = 'var(--destructive)'
const VAR_PRIMARY = 'var(--primary)'
const VAR_MUTED_FOREGROUND = 'var(--muted-foreground)'

export const getBondHealth = (
  bondUtilPct: number,
  epochsRunway: number,
): 'healthy' | 'watch' | 'critical' => {
  if (epochsRunway <= 5 || bondUtilPct >= 85) return 'critical'
  if (epochsRunway <= 10 || bondUtilPct >= 65) return 'watch'
  return 'healthy'
}

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
      color: 'var(--warning)',
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
        color: 'var(--warning)',
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
        color: VAR_MUTED_FOREGROUND,
        bg: 'var(--muted)',
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
    const days = Math.round((bondGoodForEpochs * EPOCH_HOURS) / 24)
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

export const calculateBondUtilization = (
  validator: AuctionValidator,
): number => {
  const bondBalance = validator.bondBalanceSol
  const samActive = validator.marinadeActivatedStakeSol
  if (bondBalance <= 0) return 100
  const utilization = (samActive / (bondBalance * 5000)) * 100
  return Math.min(utilization, 100)
}

export const calculateMaxApy = (
  validator: AuctionValidator,
  epochsPerYear: number,
): number => {
  const totalPmpe = validator.revShare.totalPmpe
  return Math.pow(1 + totalPmpe / 1e3, epochsPerYear) - 1
}

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
  const revShare = validator.revShare
  if (!revShare) {
    return { inflation: 0, mev: 0, blockRewards: 0, stakeBid: 0, total: 0 }
  }

  // Convert PMPE to approximate APY contribution
  const pmpeToApy = (pmpe: number) =>
    Math.pow(1 + pmpe / 1e3, epochsPerYear) - 1

  const inflation = pmpeToApy(revShare.inflationPmpe)
  const mev = pmpeToApy(revShare.mevPmpe)
  const blockRewards = pmpeToApy(revShare.blockPmpe ?? 0)
  const stakeBid = pmpeToApy(revShare.bidPmpe)
  const total = pmpeToApy(revShare.totalPmpe)

  return { inflation, mev, blockRewards, stakeBid, total }
}

export const formatStakeDelta = (
  validator: AuctionValidator,
): { text: string; color: string; arrow: string } => {
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const samActive = validator.marinadeActivatedStakeSol
  const inSet = samTarget > 0

  if (!inSet) {
    return { text: '\u2014', color: VAR_MUTED_FOREGROUND, arrow: '' }
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
  return { text: '0', color: VAR_MUTED_FOREGROUND, arrow: '\u2192' }
}

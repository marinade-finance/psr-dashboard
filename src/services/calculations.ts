import { Color } from 'src/services/types'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

export interface ApyBreakdown {
  inflation: number
  mev: number
  blockRewards: number
  bid: number
  total: number
}

export function compoundApy(pmpe: number, epochsPerYear: number): number {
  return Math.pow(1 + pmpe / 1e3, epochsPerYear) - 1
}

export function bondRunwayEpochs(
  validator: AuctionValidator,
  minBondEpochs: number,
): number {
  return validator.bondGoodForNEpochs - minBondEpochs
}

export function bondRunwayDays(epochsRunway: number): number {
  return (epochsRunway * 48) / 24
}

export function bondUtilizationPct(validator: AuctionValidator): number {
  const bondBalance = validator.bondBalanceSol
  const samActive = validator.marinadeActivatedStakeSol
  if (bondBalance <= 0) return 100
  return Math.min((samActive / (bondBalance * 5000)) * 100, 100)
}

export function getBondHealth(
  bondUtilPct: number,
  epochsRunway: number,
): 'healthy' | 'watch' | 'critical' {
  if (epochsRunway <= 5 || bondUtilPct >= 85) return 'critical'
  if (epochsRunway <= 10 || bondUtilPct >= 65) return 'watch'
  return 'healthy'
}

export function bondHealthColor(
  validator: AuctionValidator,
  minBondEpochs: number,
): Color | undefined {
  if (!validator.auctionStake.marinadeSamTargetSol) {
    return undefined
  }
  const health = bondRunwayEpochs(validator, minBondEpochs)
  if (health >= 13) return Color.GREEN
  if (health >= 6) return Color.YELLOW
  if (health >= 2) return Color.ORANGE
  return Color.RED
}

export function stakeDelta(validator: AuctionValidator): number {
  return (
    validator.auctionStake.marinadeSamTargetSol -
    validator.marinadeActivatedStakeSol
  )
}

export function selectMaxWantedStake(validator: AuctionValidator): number {
  return validator.maxStakeWanted
}

export function apyBreakdown(
  validator: AuctionValidator,
  epochsPerYear: number,
): ApyBreakdown {
  const r = validator.revShare
  return {
    inflation: compoundApy(r.inflationPmpe, epochsPerYear),
    mev: compoundApy(r.mevPmpe, epochsPerYear),
    blockRewards: compoundApy(r.blockPmpe ?? 0, epochsPerYear),
    bid: compoundApy(r.bidPmpe, epochsPerYear),
    total: compoundApy(r.totalPmpe, epochsPerYear),
  }
}

export function isNonProductive(validator: AuctionValidator): boolean {
  return (
    validator.revShare.bondObligationPmpe <
    validator.revShare.auctionEffectiveBidPmpe * 0.9
  )
}

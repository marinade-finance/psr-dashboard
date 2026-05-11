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

// Bond utilization 0..100. 0 = bond fully covers, 100 = depleted relative to
// the SDK-required minBondEpochs runway. Derives from `bondGoodForNEpochs` so
// it tracks the protocol params instead of a hard-coded PMPE factor.
export function bondUtilizationPct(
  validator: AuctionValidator,
  minBondEpochs: number,
): number {
  if (validator.bondBalanceSol <= 0) return 100
  const runway = validator.bondGoodForNEpochs ?? 0
  if (minBondEpochs <= 0) return 0
  const used = 1 - runway / minBondEpochs
  return Math.max(0, Math.min(100, used * 100))
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

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
  if ((validator.bondBalanceSol ?? 0) <= 0) return 100
  const runway = validator.bondGoodForNEpochs ?? 0
  if (minBondEpochs <= 0) return 0
  const used = 1 - runway / minBondEpochs
  return Math.max(0, Math.min(100, used * 100))
}

export function apyBreakdown(
  validator: AuctionValidator,
  epochsPerYear: number,
): ApyBreakdown {
  const rev = validator.revShare
  return {
    inflation: compoundApy(rev.inflationPmpe, epochsPerYear),
    mev: compoundApy(rev.mevPmpe, epochsPerYear),
    blockRewards: compoundApy(rev.blockPmpe ?? 0, epochsPerYear),
    bid: compoundApy(rev.bidPmpe, epochsPerYear),
    total: compoundApy(rev.totalPmpe, epochsPerYear),
  }
}

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

export interface ApyBreakdown {
  inflation: number
  mev: number
  blockRewards: number
  bid: number
  total: number
}

// Compound a per-epoch rate over a year: (1 + rate)^epochs − 1. The single
// place this exponentiation lives — compoundApy (pmpe basis) and
// selectProjectedAPY (profit/tvl basis) both route through it.
export function annualize(ratePerEpoch: number, epochsPerYear: number): number {
  return Math.pow(1 + ratePerEpoch, epochsPerYear) - 1
}

export function compoundApy(pmpe: number, epochsPerYear: number): number {
  return annualize(pmpe / 1e3, epochsPerYear)
}

// Gauge scale: 4 × idealBondEpochs puts the green "safe" zone at 25%+.
export function bondGaugeScaleMax(config: DsSamConfig): number {
  return 4 * config.idealBondEpochs
}

export function bondCriticalFrac(config: DsSamConfig): number {
  const max = bondGaugeScaleMax(config)
  return max > 0 ? config.minBondEpochs / max : 0.2
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

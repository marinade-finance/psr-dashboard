import type { BondHealthState } from './bond-health'
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

export function bondRunwayEpochs(
  validator: AuctionValidator,
  minBondEpochs: number,
): number {
  return validator.bondGoodForNEpochs - minBondEpochs
}

// The runway the UI surfaces. A no-bond or below-minimum bond (→ 'critical')
// sustains zero stake regardless of the SDK's raw bondGoodForNEpochs, which
// ignores the below-min gate — so it reads 0. Single source: the bond chip
// and the runway display can never contradict. sam-table and validator-detail
// both consume this instead of re-deriving the override.
export function effectiveBondRunway(
  validator: AuctionValidator,
  bondHealth: BondHealthState,
): number {
  if (bondHealth === 'no-bond' || bondHealth === 'critical') return 0
  // Clamp at 0 so `(Nep)` can never render a negative epoch count — the
  // SDK can theoretically expose a negative bondGoodForNEpochs and the
  // gate above doesn't catch every such case.
  return Math.max(0, validator.bondGoodForNEpochs ?? 0)
}

// Bond gauge geometry, shared so the sam-table and detail gauges share one
// scale. The 20% red boundary IS the actual SDK fee-charged threshold
// (runway < minBondEpochs): scale is chosen so minBondEpochs lands exactly
// at BOND_CRITICAL_FRAC of the track. Healthy validators (runway >
// 5×minBondEpochs) saturate at 100% — accepted tradeoff for the marker
// being literally true rather than just visually prominent.
export const BOND_CRITICAL_FRAC = 0.2

export function bondGaugeScaleMax(config: DsSamConfig): number {
  return config.minBondEpochs / BOND_CRITICAL_FRAC
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

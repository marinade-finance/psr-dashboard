import { computeBondCoverage } from 'src/services/bond-coverage'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { BondCoverage } from 'src/services/bond-coverage'

// Runway window between the penalty threshold and the red chip.
// Validators not paying yet but within this many epochs of the threshold
// get the red "top up urgently" pill.
export const BOND_URGENT_EPOCHS = 3

// Four tiers driving the bond chip color and the page-level CTA:
//   no-bond  → no bond posted at all (red)
//   critical → fee charging now, OR runway ≤ minBondEpochs + BOND_URGENT_EPOCHS (red, urgent)
//   watch    → runway between urgent threshold and idealBondEpochs (yellow)
//   healthy  → runway above idealBondEpochs (green)
//
// The former 'soft' tier (adequate but not ideal) is merged into 'watch' —
// the visual difference between "growing" and "keeping" wasn't actionable
// enough to justify a fifth color. The urgency split is now runway-based:
// within BOND_URGENT_EPOCHS of the penalty gate → red; above idealBondEpochs → green.
export const BondHealthState = {
  NO_BOND: 'no-bond',
  CRITICAL: 'critical',
  WATCH: 'watch',
  HEALTHY: 'healthy',
} as const
export type BondHealthState =
  (typeof BondHealthState)[keyof typeof BondHealthState]

export function bondHealthFromAuction(
  v: AuctionValidator,
  config: DsSamConfig,
  winningTotalPmpe: number,
  // Optional precomputed coverage. Callers that already computed it (e.g.
  // tip-engine's bondCta) can pass it through instead of forcing a second
  // call here — computeBondCoverage runs per row of the SAM table, so the
  // duplicate adds up.
  precomputedCoverage?: BondCoverage,
): BondHealthState {
  const bondBalance = v.bondBalanceSol ?? 0
  if (bondBalance <= 0) return BondHealthState.NO_BOND
  // Below the SDK minimum the validator can win no stake regardless of bid
  // (clipBondStakeCap → 0). Runway-vs-tiny-stake looks huge, so the
  // coverage-based diagnosis below would mislabel it healthy — gate it red here.
  if (bondBalance < config.minBondBalanceSol) return BondHealthState.CRITICAL
  if (!v.auctionStake.marinadeSamTargetSol && !v.marinadeActivatedStakeSol) {
    return BondHealthState.HEALTHY
  }
  const coverage =
    precomputedCoverage ?? computeBondCoverage(v, config, winningTotalPmpe)
  if (coverage.bondRiskFeeShortfall > 0) return BondHealthState.CRITICAL
  // Runway within BOND_URGENT_EPOCHS of the penalty gate → urgent red.
  const runway = v.bondGoodForNEpochs ?? 0
  if (runway <= config.minBondEpochs + BOND_URGENT_EPOCHS)
    return BondHealthState.CRITICAL
  // Below the ideal coverage target → yellow watch.
  if (runway < config.idealBondEpochs) return BondHealthState.WATCH
  return BondHealthState.HEALTHY
}

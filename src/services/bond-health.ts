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
//   critical → fee charging now, coverage shortfall, OR runway ≤ minBondEpochs + BOND_URGENT_EPOCHS (red)
//   watch    → runway between urgent threshold and idealBondEpochs (yellow)
//   healthy  → runway above idealBondEpochs (green)
export type BondHealthState = 'no-bond' | 'critical' | 'watch' | 'healthy'

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
  if (bondBalance <= 0) return 'no-bond'
  // Below the SDK minimum the validator can win no stake regardless of bid
  // (clipBondStakeCap → 0). Runway-vs-tiny-stake looks huge, so the
  // coverage-based diagnosis below would mislabel it healthy — gate it red here.
  if (bondBalance < config.minBondBalanceSol) return 'critical'
  if (!v.auctionStake.marinadeSamTargetSol && !v.marinadeActivatedStakeSol) {
    return 'healthy'
  }
  const coverage =
    precomputedCoverage ?? computeBondCoverage(v, config, winningTotalPmpe)
  if (coverage.bondRiskFeeShortfall > 0) return 'critical'
  if (v.values.bondRiskFeeSol > 0) return 'critical'
  const runway = v.bondGoodForNEpochs ?? 0
  if (runway <= config.minBondEpochs + BOND_URGENT_EPOCHS) return 'critical'
  if (runway < config.idealBondEpochs) return 'watch'
  return 'healthy'
}

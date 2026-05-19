import { computeBondCoverage } from 'src/services/bond-coverage'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Five tiers so the bond chip and the page-level CTA agree on tone:
//   no-bond  → no bond posted at all (red, "missing")
//   critical → fee being charged, about to, or bond below the SDK minimum (red)
//   watch    → bond too thin to keep current stake (orange)
//   soft     → bond covers current stake but not ideal (indigo, info)
//   healthy  → bond covers ideal target (green)
export const BondHealthState = {
  NO_BOND: 'no-bond',
  CRITICAL: 'critical',
  WATCH: 'watch',
  SOFT: 'soft',
  HEALTHY: 'healthy',
} as const
export type BondHealthState =
  (typeof BondHealthState)[keyof typeof BondHealthState]

export function bondHealthFromAuction(
  v: AuctionValidator,
  config: DsSamConfig,
  winningTotalPmpe: number,
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
  const coverage = computeBondCoverage(v, config, winningTotalPmpe)
  if (coverage.topUpToAvoidFee > 0) return 'critical'
  if (coverage.topUpToKeepStake > 0) return 'watch'
  if (coverage.topUpToIdealKeep > 0) return 'soft'
  return 'healthy'
}

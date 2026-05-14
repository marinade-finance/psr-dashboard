import { computeBondCoverage } from 'src/services/bond-coverage'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Four tiers so the bond chip and the page-level CTA agree on tone:
//   critical → fee being charged or about to (red)
//   watch    → bond too thin to keep current stake (orange)
//   soft     → bond covers current stake but not ideal (indigo, info)
//   healthy  → bond covers ideal target (green)
export type BondHealthState = 'healthy' | 'soft' | 'watch' | 'critical'

export function bondHealthFromAuction(
  v: AuctionValidator,
  config: DsSamConfig,
  winningTotalPmpe: number,
): BondHealthState {
  if (!v.auctionStake.marinadeSamTargetSol && !v.marinadeActivatedStakeSol) {
    return 'healthy'
  }
  const coverage = computeBondCoverage(
    v,
    config.minBondEpochs,
    config.idealBondEpochs,
    winningTotalPmpe,
    config.bondRiskFeeMult,
  )
  if (coverage.topUpToAvoidFee > 0) return 'critical'
  if (coverage.topUpToKeepStake > 0) return 'watch'
  if (coverage.topUpToIdealKeep > 0) return 'soft'
  return 'healthy'
}

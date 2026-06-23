// Table A — "Get into the auction". Closed-form bid needed to clear the
// current winning total. Shifts the clearing price when applied, so treat
// as a lower bound — verify with Simulate.
import { selectNonBidPmpe } from 'src/services/sam'

import type { BondCoverage } from 'src/services/bond-coverage'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type InAuctionTarget = {
  winningTotalPmpe: number
  currentTotalPmpe: number
  nonBidPmpe: number
  currentBidPmpe: number
  targetBidPmpe: number
  bidIncrease: number
  bondFloorToBack: number // coverage.stakeKeepFloor — min bond behind current stake
  bondTopUp: number // coverage.topUpToKeepStake — top-up to hold that stake
  // True when a cap is the binding constraint — clearing bid alone won't help.
  capConstrained: boolean
  capConstraintName: string | null
  // AuctionConstraintType: COUNTRY/ASO names are meaningful; omit VALIDATOR's vote account.
  capConstraintType: string | null
}

export const computeInAuctionTarget = (
  v: AugmentedAuctionValidator,
  winningTotalPmpe: number,
  coverage: BondCoverage,
): InAuctionTarget => {
  const nonBidPmpe = selectNonBidPmpe(v)
  const currentBidPmpe = v.revShare.bidPmpe
  const currentTotalPmpe = v.revShare.totalPmpe
  const pmpeGap = Math.max(0, winningTotalPmpe - currentTotalPmpe)
  const targetBidPmpe = currentBidPmpe + pmpeGap
  return {
    winningTotalPmpe,
    currentTotalPmpe,
    nonBidPmpe,
    currentBidPmpe,
    targetBidPmpe,
    bidIncrease: pmpeGap,
    bondFloorToBack: coverage.stakeKeepFloor,
    bondTopUp: coverage.topUpToKeepStake,
    capConstrained:
      v.lastCapConstraint != null &&
      v.lastCapConstraint.totalLeftToCapSol === 0,
    capConstraintName:
      v.lastCapConstraint?.totalLeftToCapSol === 0
        ? (v.lastCapConstraint.constraintName ?? null)
        : null,
    capConstraintType:
      v.lastCapConstraint?.totalLeftToCapSol === 0
        ? (v.lastCapConstraint.constraintType ?? null)
        : null,
  }
}

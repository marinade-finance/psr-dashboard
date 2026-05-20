// Table A — "Get into the auction". Closed-form estimate of the static
// bid PMPE a validator needs so its total clears the winning total PMPE,
// plus the bond it must hold behind the resulting stake.
//
// CAVEAT (last-price coupling): this is the bid that clears the CURRENT
// winning total. Adding (or growing) this winner shifts the clearing
// price, so the real answer is approximate — treat it as "at least this
// much" and verify the exact figure with the Simulate flow, which does a
// real auction rerun (runFinalOnly). There is no synchronous rerun here.
//
// Bid basis is revShare.bidPmpe — the STATIC bid, the same value the
// simulation input shows — not auctionEffectiveBidPmpe.
//
// Bond figures are read from the already-memoised BondCoverage so the
// numbers reconcile exactly with the Bond tab (no recompute, no drift).
import { selectNonBidPmpe } from 'src/services/sam'

import type { BondCoverage } from 'src/services/bond-coverage'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type InAuctionTarget = {
  winningTotalPmpe: number
  // The SDK's authoritative ranking value. Single source for "does this
  // validator clear" — same value the auction itself ranks against.
  currentTotalPmpe: number
  nonBidPmpe: number
  currentBidPmpe: number
  targetBidPmpe: number
  bidIncrease: number
  // Minimum bond required behind current stake.
  bondFloorToBack: number
  // Bond top-up to keep that stake.
  bondTopUp: number
  // True when a cap (country/ASO/etc) is the binding constraint, so
  // clearing the bid alone will NOT get the validator in.
  capConstrained: boolean
  capConstraintName: string | null
  // The SDK's AuctionConstraintType ('COUNTRY'|'ASO'|'VALIDATOR'|'WANT'|'BOND'
  // |'RISK'). VALIDATOR's `constraintName` is the vote account; UI must omit
  // it. Country/ASO names are meaningful; show them.
  capConstraintType: string | null
}

export const computeInAuctionTarget = (
  v: AugmentedAuctionValidator,
  winningTotalPmpe: number,
  coverage: BondCoverage,
): InAuctionTarget => {
  const nonBidPmpe = selectNonBidPmpe(v)
  const currentBidPmpe = v.revShare.bidPmpe
  // Auction order is `revShare.totalPmpe` desc — `currentTotalPmpe` is what
  // the auction itself ranks against. `targetBidPmpe` is the static bid
  // that would close the gap holding everything else constant; it's a
  // legible UI presentation, not the SDK's allocation logic.
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
    bondFloorToBack: coverage.floorBaseKeep,
    bondTopUp: coverage.topUpToKeepStake,
    capConstrained: v.lastCapConstraint != null,
    capConstraintName: v.lastCapConstraint?.constraintName ?? null,
    capConstraintType: v.lastCapConstraint?.constraintType ?? null,
  }
}

// Table B — "Get stake next epoch". Being in the auction set is NOT the
// same as receiving stake: next-epoch redelegation budget is handed out
// greedily by revShare.totalPmpe descending until it runs out. The
// "priority frontier" is the lowest totalPmpe among winners that were
// fully served this run — a validator wanting guaranteed priority inflow
// has to clear it.
//
// HEURISTIC (greedy reorders): raising this validator's bid changes the
// ordering and the frontier itself, so this is an estimate, not a
// guarantee. The copy and the guide must say "estimate — verify in
// Simulate". The Simulate flow does a real auction rerun.
//
// Bid basis is revShare.bidPmpe (the static bid the sim input shows).
//
// Bid gap and priority rank are CONTEXT, not target inputs. The greedy
// pass orders recipients strictly by revShare.totalPmpe descending, so
// the target bid is derived from the frontier totalPmpe alone. Bid gap
// (static bid over the clearing price) does not move that order, and the
// rank is a monotonic restatement of totalPmpe — surfacing both lets the
// user see the real inputs without re-deriving the target off them.
import {
  selectEffectiveBid,
  selectExpectedStakeChange,
  selectExpectedStakeChangeBreakdown,
  selectInSet,
  selectNonBidPmpe,
  selectRedelegationBudget,
  selectRedelegationPriorityFrontierPmpe,
  selectRedelegationPriorityRank,
} from 'src/services/sam'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type NextEpochStake = {
  inSet: boolean
  expectedDeltaSol: number
  redelegationInflowSol: number
  redelegationBudgetSol: number
  // 0 when the budget reached everyone — no binding frontier this run.
  priorityFrontierPmpe: number
  currentTotalPmpe: number
  // totalPmpe needed to sit at/above the priority frontier.
  targetTotalPmpePriority: number
  // static bid PMPE that would produce that total (non-bid components held).
  targetBidPmpePriority: number
  bidIncreaseForPriority: number
  // Context only — inputs the greedy order is read from, not target maths.
  // Static bid minus the auction clearing price, clamped at 0.
  bidGapPmpe: number
  // 1-based position in revShare.totalPmpe descending — the exact order
  // the budget is handed out in.
  priorityRank: number
}

export const computeNextEpochStake = (
  v: AugmentedAuctionValidator,
  auctionResult: AuctionResult,
): NextEpochStake => {
  const inSet = selectInSet(v)
  const currentTotalPmpe = v.revShare.totalPmpe
  const priorityFrontierPmpe =
    selectRedelegationPriorityFrontierPmpe(auctionResult)
  const nonBidPmpe = selectNonBidPmpe(v)
  const targetTotalPmpePriority = Math.max(
    currentTotalPmpe,
    priorityFrontierPmpe,
  )
  const targetBidPmpePriority = Math.max(
    0,
    targetTotalPmpePriority - nonBidPmpe,
  )
  const bidIncreaseForPriority = Math.max(
    0,
    targetBidPmpePriority - v.revShare.bidPmpe,
  )
  return {
    inSet,
    expectedDeltaSol: selectExpectedStakeChange(v),
    redelegationInflowSol:
      selectExpectedStakeChangeBreakdown(v).redelegationInflow,
    redelegationBudgetSol: selectRedelegationBudget(auctionResult),
    priorityFrontierPmpe,
    currentTotalPmpe,
    targetTotalPmpePriority,
    targetBidPmpePriority,
    bidIncreaseForPriority,
    bidGapPmpe: Math.max(0, v.revShare.bidPmpe - selectEffectiveBid(v)),
    priorityRank: selectRedelegationPriorityRank(v, auctionResult),
  }
}

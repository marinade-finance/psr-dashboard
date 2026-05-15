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
import {
  selectExpectedStakeChange,
  selectExpectedStakeChangeBreakdown,
  selectRedelegationBudget,
  selectRedelegationPriorityFrontierPmpe,
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
}

export const computeNextEpochStake = (
  v: AugmentedAuctionValidator,
  auctionResult: AuctionResult,
): NextEpochStake => {
  const inSet = v.auctionStake.marinadeSamTargetSol > 0
  const currentTotalPmpe = v.revShare.totalPmpe
  const priorityFrontierPmpe =
    selectRedelegationPriorityFrontierPmpe(auctionResult)
  const nonBidPmpe =
    v.revShare.inflationPmpe + v.revShare.mevPmpe + (v.revShare.blockPmpe ?? 0)
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
  }
}

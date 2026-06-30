// Table B — "Get stake next epoch". Redelegation budget is handed out greedily
// by revShare.totalPmpe descending; the priority frontier is the lowest totalPmpe
// among fully-served winners. Raising the bid reorders the pass, so this is an
// estimate — verify in Simulate.
import {
  selectEffectiveBid,
  selectRedelegationPriorityFrontierPmpe,
  selectRedelegationPriorityRank,
} from 'src/services/sam'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type NextEpochStake = {
  priorityFrontierPmpe: number // 0 when budget reached everyone
  targetBidPmpePriority: number
  bidIncreaseForPriority: number
  bidGapPmpe: number // static bid minus clearing price, clamped at 0
  priorityRank: number | null // 1-based; null when validator not in rank map
}

export const computeNextEpochStake = (
  v: AugmentedAuctionValidator,
  auctionResult: AuctionResult,
  minBondBalanceSol: number,
): NextEpochStake => {
  // Frontier and rank must use the same sub-min-bond skipping as the actual
  // stake allocation, else they read a different validator set than the
  // stake changes shown alongside them.
  const priorityFrontierPmpe = selectRedelegationPriorityFrontierPmpe(
    auctionResult,
    minBondBalanceSol,
  )
  const pmpeGap =
    priorityFrontierPmpe > 0
      ? Math.max(0, priorityFrontierPmpe - v.revShare.totalPmpe)
      : 0
  return {
    priorityFrontierPmpe,
    targetBidPmpePriority:
      priorityFrontierPmpe > 0 ? v.revShare.bidPmpe + pmpeGap : 0,
    bidIncreaseForPriority: pmpeGap,
    bidGapPmpe: Math.max(0, v.revShare.bidPmpe - selectEffectiveBid(v)),
    priorityRank: selectRedelegationPriorityRank(
      v,
      auctionResult,
      minBondBalanceSol,
    ),
  }
}

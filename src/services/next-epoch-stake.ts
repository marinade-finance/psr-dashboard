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
  priorityRank: number // 1-based position in totalPmpe descending order
}

export const computeNextEpochStake = (
  v: AugmentedAuctionValidator,
  auctionResult: AuctionResult,
): NextEpochStake => {
  const priorityFrontierPmpe =
    selectRedelegationPriorityFrontierPmpe(auctionResult)
  // Uses revShare.totalPmpe (SDK ranking) — reconstructing from non-bid + static
  // bid diverges when the SDK clips auctionEffectiveBidPmpe below the static bid.
  const totalGap =
    priorityFrontierPmpe > 0
      ? Math.max(0, priorityFrontierPmpe - v.revShare.totalPmpe)
      : 0
  return {
    priorityFrontierPmpe,
    targetBidPmpePriority:
      priorityFrontierPmpe > 0 ? v.revShare.bidPmpe + totalGap : 0,
    bidIncreaseForPriority: totalGap,
    bidGapPmpe: Math.max(0, v.revShare.bidPmpe - selectEffectiveBid(v)),
    priorityRank: selectRedelegationPriorityRank(v, auctionResult),
  }
}

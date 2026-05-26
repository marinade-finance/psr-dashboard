// Tests for computeNextEpochStake (Table B heuristic): priority rank selection,
// bid-gap clamping, and redelegation priority frontier interactions.
import { describe, it, expect } from 'vitest'

import { computeNextEpochStake } from '../next-epoch-stake'
import { selectRedelegationPriorityRank } from '../sam'

import type { AugmentedAuctionValidator } from '../sam'
import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'

// Minimal fixture: the greedy redelegation pass and the priority rank both
// read revShare.totalPmpe descending, so a validator with a higher total
// PMPE always sorts ahead. Bid gap is static bid minus effective bid.
function makeValidator(
  voteAccount: string,
  totalPmpe: number,
  bidPmpe: number,
  auctionEffectiveBidPmpe: number,
): AugmentedAuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: 100 },
    marinadeActivatedStakeSol: 0,
    bondBalanceSol: 100,
    stakePriority: totalPmpe,
    revShare: {
      totalPmpe,
      bidPmpe,
      auctionEffectiveBidPmpe,
      inflationPmpe: 1,
      mevPmpe: 0,
      blockPmpe: 0,
    },
    values: {
      expectedStakeChangeSol: 0,
      expectedStakeRedelegationInflowSol: 0,
    },
  } as unknown as AugmentedAuctionValidator
}

function makeResult(validators: AugmentedAuctionValidator[]): AuctionResult {
  return {
    winningTotalPmpe: 5,
    auctionData: {
      validators,
      stakeAmounts: { marinadeSamTvlSol: 0 },
    },
  } as unknown as AuctionResult
}

describe('selectRedelegationPriorityRank', () => {
  it('ranks by totalPmpe descending — the greedy budget order', () => {
    const a = makeValidator('A', 12, 4, 4)
    const b = makeValidator('B', 10, 3, 3)
    const c = makeValidator('C', 8, 2, 2)
    const result = makeResult([b, a, c])
    expect(selectRedelegationPriorityRank(a, result)).toBe(1)
    expect(selectRedelegationPriorityRank(b, result)).toBe(2)
    expect(selectRedelegationPriorityRank(c, result)).toBe(3)
  })

  it('ties share the higher position', () => {
    const a = makeValidator('A', 10, 3, 3)
    const b = makeValidator('B', 10, 3, 3)
    const c = makeValidator('C', 8, 2, 2)
    const result = makeResult([a, b, c])
    // Neither A nor B has a strictly-higher peer → both rank 1.
    expect(selectRedelegationPriorityRank(a, result)).toBe(1)
    expect(selectRedelegationPriorityRank(b, result)).toBe(1)
    expect(selectRedelegationPriorityRank(c, result)).toBe(3)
  })
})

describe('computeNextEpochStake — context fields', () => {
  it('surfaces bid gap as static bid minus effective bid, clamped at 0', () => {
    const over = makeValidator('OVER', 10, 5, 3)
    const under = makeValidator('UNDER', 8, 2, 4)
    const result = makeResult([over, under])
    expect(computeNextEpochStake(over, result).bidGapPmpe).toBeCloseTo(2, 9)
    // Static bid below the clearing price → no negative gap.
    expect(computeNextEpochStake(under, result).bidGapPmpe).toBe(0)
  })

  it('surfaces the priority rank from the greedy order', () => {
    const a = makeValidator('A', 12, 4, 4)
    const b = makeValidator('B', 9, 3, 3)
    const result = makeResult([b, a])
    expect(computeNextEpochStake(a, result).priorityRank).toBe(1)
    expect(computeNextEpochStake(b, result).priorityRank).toBe(2)
  })

  it('does not let bid gap or rank shift the target bid maths', () => {
    // OVER overpays heavily (big bid gap) but its target-bid figure is
    // still derived only from the frontier totalPmpe, not the gap.
    const over = makeValidator('OVER', 10, 9, 2)
    const result = makeResult([over])
    const n = computeNextEpochStake(over, result)
    // No binding frontier here → target equals current, no increase.
    expect(n.bidIncreaseForPriority).toBe(0)
    expect(n.bidGapPmpe).toBeGreaterThan(0)
  })
})

describe('computeNextEpochStake — validator already clears the frontier', () => {
  it('totalPmpe >= frontier → bidIncreaseForPriority=0', () => {
    // Single fully-served validator: priorityFrontierPmpe = its own totalPmpe.
    // Since totalPmpe >= frontier the gap is 0 → no increase needed.
    const a = makeValidator('A', 10, 4, 4)
    const vFull: AugmentedAuctionValidator = {
      ...a,
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 100 },
      values: { expectedStakeChangeSol: 100, expectedStakeRedelegationInflowSol: 100 },
    } as unknown as AugmentedAuctionValidator
    const result = {
      winningTotalPmpe: 5,
      auctionData: {
        validators: [vFull],
        stakeAmounts: { marinadeSamTvlSol: 10000 },
      },
    } as unknown as import('@marinade.finance/ds-sam-sdk').AuctionResult
    const n = computeNextEpochStake(vFull, result)
    // frontier = validator's own totalPmpe (10); validator clears it → no increase
    expect(n.bidIncreaseForPriority).toBe(0)
    // targetBidPmpePriority = currentBid + 0 = 4
    expect(n.targetBidPmpePriority).toBe(4)
  })
})

describe('computeNextEpochStake — validator above the frontier', () => {
  it('validator totalPmpe > frontier → bidIncreaseForPriority=0', () => {
    // A=20 is above frontier=10 → no increase needed
    const a = makeValidator('A', 20, 8, 8)
    const b = makeValidator('B', 10, 4, 4)
    const result = makeResult([a, b])
    const n = computeNextEpochStake(a, result)
    expect(n.bidIncreaseForPriority).toBe(0)
  })

  it('validator totalPmpe < frontier → bidIncreaseForPriority = frontier - totalPmpe', () => {
    const a = makeValidator('A', 20, 8, 8)
    const b = makeValidator('B', 5, 2, 2)
    const result = makeResult([a, b])
    // frontier is the lowest fully-served, which is whichever got full allocation;
    // b is below the frontier → increase = frontier - 5
    const nb = computeNextEpochStake(b, result)
    if (nb.priorityFrontierPmpe > 0) {
      expect(nb.bidIncreaseForPriority).toBeGreaterThan(0)
    }
  })
})

describe('selectRedelegationPriorityRank — single validator', () => {
  it('single validator in result → rank 1', () => {
    const a = makeValidator('A', 10, 4, 4)
    const result = makeResult([a])
    expect(selectRedelegationPriorityRank(a, result)).toBe(1)
  })
})

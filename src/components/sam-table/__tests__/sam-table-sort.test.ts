// Tests for makeCompareFn (table sort): rank column sorts by totalPmpe descending,
// not by stakeDelta — regression guard for the sort-key selection.
import { describe, expect, it } from 'vitest'

import { makeCompareFn } from '../sam-table'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

// Regression: rank-sort fell through to stakeDelta and ranked by samTarget −
// active. Rank should mirror auctionRankMap, which sorts by selectMaxAPY desc
// (= totalPmpe desc, since compoundApy is monotonic in totalPmpe).

function v(totalPmpe: number, samTarget = 1000, active = 0): AuctionValidator {
  return {
    voteAccount: `va-${totalPmpe}`,
    auctionStake: { marinadeSamTargetSol: samTarget },
    marinadeActivatedStakeSol: active,
    revShare: { totalPmpe },
  } as unknown as AuctionValidator
}

const EPOCHS_PER_YEAR = 182

describe('rank sort uses maxApy desc', () => {
  it('orders by totalPmpe desc on default desc dir', () => {
    const arr = [v(10), v(30), v(20)]
    const sorted = [...arr].sort(
      makeCompareFn('rank', 'desc', undefined, EPOCHS_PER_YEAR),
    )
    expect(sorted.map(x => x.revShare.totalPmpe)).toEqual([30, 20, 10])
  })

  it('orders by totalPmpe asc when dir=asc', () => {
    const arr = [v(10), v(30), v(20)]
    const sorted = [...arr].sort(
      makeCompareFn('rank', 'asc', undefined, EPOCHS_PER_YEAR),
    )
    expect(sorted.map(x => x.revShare.totalPmpe)).toEqual([10, 20, 30])
  })

  it('rank is independent of stakeDelta (target − active)', () => {
    // Pre-fix the rank branch fell through to stakeDelta. Construct a case
    // where stakeDelta order ≠ totalPmpe order, then assert totalPmpe wins.
    const high = v(50, /*samTarget*/ 100, /*active*/ 100) // delta=0
    const low = v(5, /*samTarget*/ 5000, /*active*/ 0) // delta=+5000
    const sorted = [high, low].sort(
      makeCompareFn('rank', 'desc', undefined, EPOCHS_PER_YEAR),
    )
    // By totalPmpe desc, `high` (50) precedes `low` (5).
    // Pre-fix sort would have placed `low` (delta 5000) first.
    expect(sorted[0]).toBe(high)
    expect(sorted[1]).toBe(low)
  })
})

// Tests for computeBidding: stake/delta/cost arithmetic, bidGap clamping,
// activating/activatingCost decomposition, and formatting fields.
import { describe, it, expect, vi } from 'vitest'

import { computeBidding } from '../bidding'

import type { AugmentedAuctionValidator } from '../sam'

vi.mock('../validators', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual }
})

function makeValidator(overrides: Record<string, unknown> = {}): AugmentedAuctionValidator {
  return {
    voteAccount: 'v1',
    marinadeActivatedStakeSol: 10000,
    inflationCommissionDec: 0.08,
    mevCommissionDec: 0.05,
    blockRewardsCommissionDec: 0.05,
    auctionStake: { marinadeSamTargetSol: 15000 },
    values: {
      expectedStakeChangeSol: 5000,
      commissions: null,
    },
    revShare: {
      bidPmpe: 10,
      auctionEffectiveBidPmpe: 8,
      activatingStakePmpe: 2,
      inflationPmpe: 5,
      mevPmpe: 2,
      blockPmpe: 1,
      totalPmpe: 18,
    },
    ...overrides,
  } as unknown as AugmentedAuctionValidator
}

describe('computeBidding — stake and target', () => {
  it('active=10000, target=15000 → active and target match validator fields', () => {
    const b = computeBidding(makeValidator())
    expect(b.active).toBe(10000)
    expect(b.target).toBe(15000)
  })

  it('active=target=10000 → delta=0, activating=0', () => {
    const b = computeBidding(makeValidator({
      marinadeActivatedStakeSol: 10000,
      auctionStake: { marinadeSamTargetSol: 10000 },
      values: { expectedStakeChangeSol: 0, commissions: null },
    }))
    expect(b.delta).toBe(0)
    expect(b.activating).toBe(0)
  })
})

describe('computeBidding — delta decomposition', () => {
  it('positive expectedStakeChange → delta>0, activating=delta', () => {
    const b = computeBidding(makeValidator())
    expect(b.delta).toBe(5000)
    expect(b.activating).toBe(5000)
  })

  it('negative expectedStakeChange → delta<0, activating=0 (clamped)', () => {
    const b = computeBidding(makeValidator({
      values: { expectedStakeChangeSol: -3000, commissions: null },
    }))
    expect(b.delta).toBe(-3000)
    expect(b.activating).toBe(0)
  })
})

describe('computeBidding — bid and effBid', () => {
  it('bid=10 (bidPmpe), effBid=8 (auctionEffectiveBidPmpe)', () => {
    const b = computeBidding(makeValidator())
    expect(b.bid).toBe(10)
    expect(b.effBid).toBe(8)
  })

  it('bidGap = max(0, bid - effBid)', () => {
    const b = computeBidding(makeValidator())
    expect(b.bidGap).toBe(2)
  })

  it('effBid > bid → bidGap=0 (no negative gap)', () => {
    const b = computeBidding(makeValidator({
      revShare: {
        bidPmpe: 3,
        auctionEffectiveBidPmpe: 8,
        activatingStakePmpe: 0,
        inflationPmpe: 5,
        mevPmpe: 2,
        blockPmpe: 1,
        totalPmpe: 11,
      },
    }))
    expect(b.bidGap).toBe(0)
  })

  it('bid === effBid → bidGap=0', () => {
    const b = computeBidding(makeValidator({
      revShare: {
        bidPmpe: 8,
        auctionEffectiveBidPmpe: 8,
        activatingStakePmpe: 2,
        inflationPmpe: 5,
        mevPmpe: 2,
        blockPmpe: 1,
        totalPmpe: 16,
      },
    }))
    expect(b.bidGap).toBe(0)
  })
})

describe('computeBidding — cost arithmetic', () => {
  it('cost = (stake/1000) * auctionEffectiveBidPmpe', () => {
    const b = computeBidding(makeValidator())
    // (10000/1000) * 8 = 80
    expect(b.cost).toBeCloseTo(80, 9)
  })

  it('activatingCost = (activatingStakePmpe * activating) / 1000', () => {
    const b = computeBidding(makeValidator())
    // (2 * 5000) / 1000 = 10
    expect(b.activatingCost).toBeCloseTo(10, 9)
  })

  it('total = cost + activatingCost', () => {
    const b = computeBidding(makeValidator())
    expect(b.total).toBeCloseTo(b.cost + b.activatingCost, 9)
  })

  it('zero stake → cost=0 and activatingCost=0', () => {
    const b = computeBidding(makeValidator({
      marinadeActivatedStakeSol: 0,
      values: { expectedStakeChangeSol: 0, commissions: null },
    }))
    expect(b.cost).toBe(0)
    expect(b.activatingCost).toBe(0)
    expect(b.total).toBe(0)
  })
})

describe('computeBidding — formatted commission fields', () => {
  it('inflPct is a percentage string derived from inflationCommissionDec', () => {
    const b = computeBidding(makeValidator())
    expect(b.inflPct).toMatch(/^\d+%$/)
  })

  it('mevPct is "-" when mevCommissionDec is null', () => {
    const b = computeBidding(makeValidator({ mevCommissionDec: null }))
    expect(b.mevPct).toBe('-')
  })

  it('mevPct is a percentage string when mevCommissionDec is set', () => {
    const b = computeBidding(makeValidator())
    expect(b.mevPct).toMatch(/^\d+%$/)
  })

  it('blkPct is a percentage string', () => {
    const b = computeBidding(makeValidator())
    expect(b.blkPct).toMatch(/^\d+%$/)
  })
})

describe('computeBidding — stake field', () => {
  it('stake = marinadeActivatedStakeSol (raw, not target)', () => {
    const b = computeBidding(makeValidator())
    expect(b.stake).toBe(10000)
  })
})

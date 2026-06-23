// Tests for computeInAuctionTarget (Table A): bid arithmetic, cap constraint
// extraction, and boundary cases.
import { describe, it, expect, vi } from 'vitest'

import { computeInAuctionTarget } from '../in-auction-target'

import type { AugmentedAuctionValidator } from '../sam'
import type { BondCoverage } from '../bond-coverage'

vi.mock('../validators', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual }
})

function makeValidator(
  overrides: Record<string, unknown> = {},
): AugmentedAuctionValidator {
  return {
    voteAccount: 'v1',
    marinadeActivatedStakeSol: 10000,
    auctionStake: { marinadeSamTargetSol: 10000 },
    lastCapConstraint: null,
    revShare: {
      bidPmpe: 8,
      totalPmpe: 20,
      inflationPmpe: 5,
      mevPmpe: 4,
      blockPmpe: 3,
      auctionEffectiveBidPmpe: 8,
    },
    values: { expectedStakeChangeSol: 0 },
    ...overrides,
  } as unknown as AugmentedAuctionValidator
}

function makeCoverage(overrides: Partial<BondCoverage> = {}): BondCoverage {
  return {
    stakeKeepFloor: 50,
    topUpToKeepStake: 0,
    ...overrides,
  } as BondCoverage
}

describe('computeInAuctionTarget — bid arithmetic', () => {
  it('already above winning total → targetBidPmpe = currentBidPmpe (no increase)', () => {
    // currentTotal=20 > winningTotal=15 → pmpeGap=0
    const t = computeInAuctionTarget(makeValidator(), 15, makeCoverage())
    expect(t.bidIncrease).toBe(0)
    expect(t.targetBidPmpe).toBe(8)
  })

  it('below winning total → targetBidPmpe = currentBidPmpe + gap', () => {
    // currentTotal=20, winningTotal=25 → gap=5 → targetBid=8+5=13
    const t = computeInAuctionTarget(makeValidator(), 25, makeCoverage())
    expect(t.bidIncrease).toBe(5)
    expect(t.targetBidPmpe).toBe(13)
  })

  it('exactly at winning total → bidIncrease=0', () => {
    const t = computeInAuctionTarget(makeValidator(), 20, makeCoverage())
    expect(t.bidIncrease).toBe(0)
    expect(t.targetBidPmpe).toBe(8)
  })

  it('nonBidPmpe = inflationPmpe + mevPmpe + blockPmpe', () => {
    // 5 + 4 + 3 = 12
    const t = computeInAuctionTarget(makeValidator(), 20, makeCoverage())
    expect(t.nonBidPmpe).toBeCloseTo(12, 9)
  })

  it('currentTotalPmpe and winningTotalPmpe are surfaced verbatim', () => {
    const t = computeInAuctionTarget(makeValidator(), 25, makeCoverage())
    expect(t.currentTotalPmpe).toBe(20)
    expect(t.winningTotalPmpe).toBe(25)
  })
})

describe('computeInAuctionTarget — coverage passthrough', () => {
  it('bondFloorToBack = coverage.stakeKeepFloor', () => {
    const t = computeInAuctionTarget(
      makeValidator(),
      15,
      makeCoverage({ stakeKeepFloor: 123 }),
    )
    expect(t.bondFloorToBack).toBe(123)
  })

  it('bondTopUp = coverage.topUpToKeepStake', () => {
    const t = computeInAuctionTarget(
      makeValidator(),
      15,
      makeCoverage({ topUpToKeepStake: 42 }),
    )
    expect(t.bondTopUp).toBe(42)
  })
})

describe('computeInAuctionTarget — cap constraints', () => {
  it('no lastCapConstraint → capConstrained=false, names null', () => {
    const t = computeInAuctionTarget(makeValidator(), 15, makeCoverage())
    expect(t.capConstrained).toBe(false)
    expect(t.capConstraintName).toBeNull()
    expect(t.capConstraintType).toBeNull()
  })

  it('cap with totalLeftToCapSol=0 → capConstrained=true, names populated', () => {
    const v = makeValidator({
      lastCapConstraint: {
        constraintType: 'ASO',
        constraintName: 'Hetzner Online GmbH',
        totalStakeSol: 1_000_000,
        totalLeftToCapSol: 0,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const t = computeInAuctionTarget(v, 15, makeCoverage())
    expect(t.capConstrained).toBe(true)
    expect(t.capConstraintName).toBe('Hetzner Online GmbH')
    expect(t.capConstraintType).toBe('ASO')
  })

  it('cap with totalLeftToCapSol>0 → capConstrained=false, names null (headroom left)', () => {
    const v = makeValidator({
      lastCapConstraint: {
        constraintType: 'COUNTRY',
        constraintName: 'Germany',
        totalStakeSol: 500_000,
        totalLeftToCapSol: 50_000,
        marinadeLeftToCapSol: 50_000,
        validators: [],
      },
    })
    const t = computeInAuctionTarget(v, 15, makeCoverage())
    expect(t.capConstrained).toBe(false)
    expect(t.capConstraintName).toBeNull()
    expect(t.capConstraintType).toBeNull()
  })

  it('VALIDATOR cap type (vote account) → type surfaced as-is', () => {
    const v = makeValidator({
      lastCapConstraint: {
        constraintType: 'VALIDATOR',
        constraintName: null,
        totalStakeSol: 100_000,
        totalLeftToCapSol: 0,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const t = computeInAuctionTarget(v, 15, makeCoverage())
    expect(t.capConstrained).toBe(true)
    expect(t.capConstraintName).toBeNull()
    expect(t.capConstraintType).toBe('VALIDATOR')
  })
})

describe('computeInAuctionTarget — zero winning total', () => {
  it('winningTotalPmpe=0 and currentTotal=0 → bidIncrease=0', () => {
    const v = makeValidator({
      revShare: {
        bidPmpe: 0,
        totalPmpe: 0,
        inflationPmpe: 0,
        mevPmpe: 0,
        blockPmpe: 0,
        auctionEffectiveBidPmpe: 0,
      },
    })
    const t = computeInAuctionTarget(v, 0, makeCoverage())
    expect(t.bidIncrease).toBe(0)
    expect(t.targetBidPmpe).toBe(0)
  })
})

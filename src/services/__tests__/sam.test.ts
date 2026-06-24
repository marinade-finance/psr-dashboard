// Tests for augmentAuctionResult: dense cutoffRank computation, tied validators,
// sub-min-bond stake loss, and selectCutoffRank edge cases.
import { describe, it, expect, vi } from 'vitest'

import {
  augmentAuctionResult,
  selectCutoffRank,
  selectExpectedStakeChange,
  selectExpectedStakeChangeBreakdown,
  selectRedelegationPriorityFrontierPmpe,
  selectRedelegationPriorityRank,
  selectWinningApyForValidator,
} from '../sam'

import { compoundApy } from '../calculations'

import type * as ValidatorsModule from '../validators'
import type {
  AuctionResult,
  AuctionValidator,
} from '@marinade.finance/ds-sam-sdk'

vi.mock('../validators', async importOriginal => {
  const actual = await importOriginal<typeof ValidatorsModule>()
  return { ...actual }
})

function makeValidator(
  voteAccount: string,
  totalPmpe: number,
  inSet: boolean,
): AuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: inSet ? 100 : 0 },
    marinadeActivatedStakeSol: 0,
    bondBalanceSol: 0,
    values: {},
    revShare: { totalPmpe },
  } as unknown as AuctionValidator
}

function makeResult(
  winningTotalPmpe: number,
  validators: AuctionValidator[],
): AuctionResult {
  return {
    winningTotalPmpe,
    auctionData: {
      validators,
      stakeAmounts: { marinadeSamTvlSol: 0 },
    },
  } as unknown as AuctionResult
}

describe('augmentAuctionResult — dense cutoffRank', () => {
  it('marginal winner sits at rank 0', () => {
    const result = makeResult(10, [
      makeValidator('A', 12, true),
      makeValidator('B', 10, true),
      makeValidator('C', 8, false),
    ])
    const augmented = augmentAuctionResult(result, 0)
    const byVa = new Map(
      augmented.map(v => [v.voteAccount, selectCutoffRank(v)]),
    )
    expect(byVa.get('B')).toBe(0)
  })

  it('tied-above validators share the same positive rank', () => {
    const result = makeResult(10, [
      makeValidator('A', 12, true),
      makeValidator('B', 12, true),
      makeValidator('C', 10, true),
      makeValidator('D', 8, false),
    ])
    const augmented = augmentAuctionResult(result, 0)
    const byVa = new Map(
      augmented.map(v => [v.voteAccount, selectCutoffRank(v)]),
    )
    expect(byVa.get('A')).toBe(1)
    expect(byVa.get('B')).toBe(1)
    expect(byVa.get('C')).toBe(0)
  })

  it('tied-below validators share the same negative rank', () => {
    const result = makeResult(10, [
      makeValidator('A', 10, true),
      makeValidator('B', 8, false),
      makeValidator('C', 8, false),
      makeValidator('D', 6, false),
    ])
    const augmented = augmentAuctionResult(result, 0)
    const byVa = new Map(
      augmented.map(v => [v.voteAccount, selectCutoffRank(v)]),
    )
    expect(byVa.get('A')).toBe(0)
    expect(byVa.get('B')).toBe(-1)
    expect(byVa.get('C')).toBe(-1)
    expect(byVa.get('D')).toBe(-2)
  })

  it('strict ordering: ranks step by distinct tiers, above/below the cutoff', () => {
    const result = makeResult(10, [
      makeValidator('A', 14, true),
      makeValidator('B', 12, true),
      makeValidator('C', 10, true),
      makeValidator('D', 8, false),
      makeValidator('E', 6, false),
    ])
    const augmented = augmentAuctionResult(result, 0)
    const byVa = new Map(
      augmented.map(v => [v.voteAccount, selectCutoffRank(v)]),
    )
    expect(byVa.get('A')).toBe(2)
    expect(byVa.get('B')).toBe(1)
    expect(byVa.get('C')).toBe(0)
    expect(byVa.get('D')).toBe(-1)
    expect(byVa.get('E')).toBe(-2)
  })
})

function makeBondValidator(
  voteAccount: string,
  bondBalanceSol: number,
  active: number,
  target: number,
  paidUndelegationSol = 0,
): AuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: target },
    marinadeActivatedStakeSol: active,
    bondBalanceSol,
    values: { paidUndelegationSol },
    revShare: { totalPmpe: 10 },
  } as unknown as AuctionValidator
}

function makeBondResult(
  validators: AuctionValidator[],
  tvl: number,
): AuctionResult {
  return {
    winningTotalPmpe: 10,
    auctionData: {
      validators,
      stakeAmounts: { marinadeSamTvlSol: tvl },
    },
  } as unknown as AuctionResult
}

describe('augmentAuctionResult — bond below minBondBalanceSol', () => {
  it('predicts a full loss; the three components still sum exactly', () => {
    // SUB has a sub-minimum bond and is below target — it would otherwise
    // be a redelegation recipient. It must instead lose ALL active stake.
    const result = makeBondResult(
      [
        makeBondValidator('SUB', 0.05, 1000, 5000),
        makeBondValidator('OK', 5, 2000, 8000),
      ],
      // TVL > Σactive so there is a redelegation budget to hand out.
      20000,
    )
    const augmented = augmentAuctionResult(result, 0.1)
    const sub = augmented.find(v => v.voteAccount === 'SUB')
    expect(sub).toBeDefined()
    if (!sub) return
    const total = selectExpectedStakeChange(sub)
    const bd = selectExpectedStakeChangeBreakdown(sub)

    expect(total).toBe(-1000)
    expect(bd.paidUndelegation).toBe(-1000)
    expect(bd.redelegationInflow).toBe(0)
    expect(
      bd.paidUndelegation + bd.redelegationInflow + bd.naturalWithdrawal,
    ).toBeCloseTo(total, 9)
  })

  it('leaves a healthy-bond validator unaffected', () => {
    const result = makeBondResult(
      [
        makeBondValidator('SUB', 0.05, 1000, 5000),
        makeBondValidator('OK', 5, 2000, 8000),
      ],
      20000,
    )
    const augmented = augmentAuctionResult(result, 0.1)
    const ok = augmented.find(v => v.voteAccount === 'OK')
    expect(ok).toBeDefined()
    if (!ok) return
    const total = selectExpectedStakeChange(ok)
    const bd = selectExpectedStakeChangeBreakdown(ok)

    // Healthy bond, below target, budget available → positive inflow,
    // never a forced full loss.
    expect(total).not.toBe(-2000)
    expect(bd.redelegationInflow).toBeGreaterThan(0)
    expect(
      bd.paidUndelegation + bd.redelegationInflow + bd.naturalWithdrawal,
    ).toBeCloseTo(total, 9)
  })
})

describe('computeExpectedStakeChanges — paid undelegation disabled (PAID_UNDELEGATION_ENABLED=false)', () => {
  // The protocol allocates the 1% rotation budget bottom-up by unstakePriority
  // and does not currently prioritise undelegating paid-undelegation validators,
  // so paidUndelegationSol resolves to 0: a validator at target does not lose
  // that stake this epoch. These tests pin the switched-off projection.

  it('no loss when active == target despite a paid undelegation', () => {
    const paid = 2815
    const active = 40389
    const result = makeBondResult(
      [makeBondValidator('V', 5, active, active, paid)],
      active * 10,
    )
    const [v] = augmentAuctionResult(result, 0)
    const bd = selectExpectedStakeChangeBreakdown(v)
    // paid treated as 0; rawDelta = target - active = 0 → no inflow either
    expect(selectExpectedStakeChange(v)).toBeCloseTo(0, 9)
    expect(bd.paidUndelegation).toBeCloseTo(0, 9)
    expect(bd.redelegationInflow).toBeCloseTo(0, 9)
  })

  it('no loss regardless of rotation budget size when active == target', () => {
    const paid = 3000
    const active = 10000
    const result = makeBondResult(
      [makeBondValidator('V', 5, active, active, paid)],
      active + 1000,
    )
    const [v] = augmentAuctionResult(result, 0)
    const bd = selectExpectedStakeChangeBreakdown(v)
    expect(selectExpectedStakeChange(v)).toBeCloseTo(0, 9)
    expect(bd.paidUndelegation).toBeCloseTo(0, 9)
    expect(bd.redelegationInflow).toBeCloseTo(0, 9)
  })

  it('target > active: paid = 0 by protocol, inflow fills gap normally', () => {
    // paidUndelegationSol is only non-zero when target <= active; this case
    // confirms no undelegation component appears when target > active.
    const active = 8000
    const target = 10000
    const result = makeBondResult(
      [makeBondValidator('V', 5, active, target, 0)],
      active * 10,
    )
    const [v] = augmentAuctionResult(result, 0)
    const bd = selectExpectedStakeChangeBreakdown(v)
    expect(selectExpectedStakeChange(v)).toBeCloseTo(target - active, 9)
    expect(bd.paidUndelegation).toBeCloseTo(0, 9)
    expect(bd.redelegationInflow).toBeCloseTo(target - active, 9)
  })
})

describe('computeNaturalWithdrawal — paid undelegation disabled, rotation uses full excess', () => {
  // With PAID_UNDELEGATION_ENABLED=false the paid amount no longer pre-reduces
  // the over-target excess, so the 1% rotation budget rotates the whole excess.

  it('rotation takes the full over-target excess up to the budget', () => {
    // active=10000, target=5000 → excess = 5000; TVL=500000 → 1% budget = 5000
    const result = makeBondResult(
      [makeBondValidator('V', 5, 10000, 5000, 2000)],
      500000,
    )
    const [v] = augmentAuctionResult(result, 0)
    const bd = selectExpectedStakeChangeBreakdown(v)
    expect(bd.paidUndelegation).toBeCloseTo(0, 9)
    expect(bd.naturalWithdrawal).toBeCloseTo(-5000, 9)
    expect(selectExpectedStakeChange(v)).toBeCloseTo(-5000, 9)
  })

  it('rotation takes the whole excess when budget covers it', () => {
    // active=10000, target=8000 → excess = 2000; budget = 5000 covers it
    const result = makeBondResult(
      [makeBondValidator('V', 5, 10000, 8000, 3000)],
      500000,
    )
    const [v] = augmentAuctionResult(result, 0)
    const bd = selectExpectedStakeChangeBreakdown(v)
    expect(bd.paidUndelegation).toBeCloseTo(0, 9)
    expect(bd.naturalWithdrawal).toBeCloseTo(-2000, 9)
    expect(selectExpectedStakeChange(v)).toBeCloseTo(-2000, 9)
  })
})

function makePrioValidator(
  voteAccount: string,
  totalPmpe: number,
  active: number,
  target: number,
  bondBalanceSol = 5,
): AuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: target },
    marinadeActivatedStakeSol: active,
    bondBalanceSol,
    values: { paidUndelegationSol: 0 },
    revShare: { totalPmpe },
  } as unknown as AuctionValidator
}

describe('allocateRedelegation — best-first walk by totalPmpe desc', () => {
  // Two below-target winners; budget only covers one full delta. The greedy
  // pass must reach the HIGHER-totalPmpe validator first. Input order is
  // deliberately worst-first to prove the sort reorders it.
  function tightBudgetResult(): AuctionResult {
    return makeBondResult(
      [
        makePrioValidator('LOW', 8, 0, 1000),
        makePrioValidator('HIGH', 12, 0, 1000),
      ],
      // TVL − Σactive = 1000 budget; each wants 1000, so only one is filled.
      1000,
    )
  }

  it('priority rank 1 is the highest-totalPmpe validator', () => {
    const result = tightBudgetResult()
    const high = result.auctionData.validators.find(
      v => v.voteAccount === 'HIGH',
    )
    const low = result.auctionData.validators.find(v => v.voteAccount === 'LOW')
    expect(high).toBeDefined()
    expect(low).toBeDefined()
    if (!high || !low) return
    expect(selectRedelegationPriorityRank(high, result)).toBe(1)
    expect(selectRedelegationPriorityRank(low, result)).toBe(2)
  })

  it('the budget fills the higher-totalPmpe validator first', () => {
    const result = tightBudgetResult()
    const augmented = augmentAuctionResult(result, 0)
    const high = augmented.find(v => v.voteAccount === 'HIGH')
    const low = augmented.find(v => v.voteAccount === 'LOW')
    expect(high).toBeDefined()
    expect(low).toBeDefined()
    if (!high || !low) return
    expect(selectExpectedStakeChange(high)).toBeCloseTo(1000, 9)
    expect(selectExpectedStakeChange(low)).toBe(0)
  })

  it('priority frontier is the lowest fully-served totalPmpe', () => {
    const result = tightBudgetResult()
    // Only HIGH (12) is fully served; LOW never gets budget → frontier = 12.
    expect(selectRedelegationPriorityFrontierPmpe(result)).toBe(12)
  })

  it('frontier skips sub-min-bond validators when minBondBalanceSol is set', () => {
    // Budget (1000) covers both 500-deltas. HIGH (bond 100) is healthy; LOW
    // (bond 1, totalPmpe 8) is sub-min. At minBond=0 LOW is served too, so the
    // frontier drops to 8. At minBond=10 LOW is skipped — matching the actual
    // stake allocation — so the frontier stays at HIGH's 12.
    const result = makeBondResult(
      [
        makePrioValidator('LOW', 8, 0, 500, 1),
        makePrioValidator('HIGH', 12, 0, 500, 100),
      ],
      1000,
    )
    expect(selectRedelegationPriorityFrontierPmpe(result, 0)).toBe(8)
    expect(selectRedelegationPriorityFrontierPmpe(result, 10)).toBe(12)
  })
})

function makeApyValidator(
  voteAccount: string,
  totalPmpe: number,
  nonBid: number,
  inSet: boolean,
): AuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: inSet ? 100 : 0 },
    marinadeActivatedStakeSol: 0,
    bondBalanceSol: 5,
    values: { paidUndelegationSol: 0 },
    revShare: { totalPmpe, inflationPmpe: nonBid, mevPmpe: 0, blockPmpe: 0 },
  } as unknown as AuctionValidator
}

describe('selectWinningApyForValidator — marginal winner', () => {
  it('rebuilds the bid from the LOWEST-totalPmpe in-set validator', () => {
    // In-set: HIGH (totalPmpe 12) and MARG (totalPmpe 10, the clearing winner).
    // OUT (totalPmpe 8) is not in set. The bid component must come from MARG's
    // non-bid profile (nonBid=3), not HIGH's (nonBid=7) or OUT's. Input order
    // is worst-first so a worst-first walk would wrongly pick HIGH last.
    const result = makeResult(10, [
      makeApyValidator('OUT', 8, 1, false),
      makeApyValidator('MARG', 10, 3, true),
      makeApyValidator('HIGH', 12, 7, true),
    ])
    const self = makeApyValidator('SELF', 11, 5, true)
    const epochsPerYear = 160
    const winningBidPmpe = Math.max(0, 10 - 3) // winningTotalPmpe − MARG nonBid
    const expected = compoundApy(5 + winningBidPmpe, epochsPerYear)
    expect(
      selectWinningApyForValidator(self, result, epochsPerYear),
    ).toBeCloseTo(expected, 9)
  })
})

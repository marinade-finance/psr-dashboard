import { describe, it, expect, vi } from 'vitest'

import {
  augmentAuctionResult,
  selectCutoffRank,
  selectExpectedStakeChange,
  selectExpectedStakeChangeBreakdown,
} from '../sam'

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
): AuctionValidator {
  return {
    voteAccount,
    auctionStake: { marinadeSamTargetSol: target },
    marinadeActivatedStakeSol: active,
    bondBalanceSol,
    values: { paidUndelegationSol: 0 },
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

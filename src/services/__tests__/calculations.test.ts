import { describe, it, expect, vi } from 'vitest'

import {
  compoundApy,
  bondRunwayEpochs,
  bondUtilizationPct,
  apyBreakdown,
} from '../calculations'
import { selectProjectedAPY } from '../sam'
import { selectMaxProtectedStake } from '../validator-with-bond'

import type { ValidatorWithBond } from '../validator-with-bond'
import type * as ValidatorsModule from '../validators'
import type {
  AuctionValidator,
  AuctionResult,
} from '@marinade.finance/ds-sam-sdk'

// sam.ts calls loadSam which hits external APIs — mock the module-level fetches
// selectProjectedAPY is a pure function, no mocking needed for it
// But sam.ts imports from validators which does a fetch at module level — mock it
vi.mock('../validators', async importOriginal => {
  const actual = await importOriginal<typeof ValidatorsModule>()
  return { ...actual }
})

function makeAuctionResult(
  tvlSol: number,
  validators: Partial<AuctionValidator>[] = [],
): AuctionResult {
  return {
    winningTotalPmpe: 10,
    auctionData: {
      validators: validators as AuctionValidator[],
      stakeAmounts: {
        marinadeSamTvlSol: tvlSol,
      },
    },
  } as unknown as AuctionResult
}

function makeValidator(
  overrides: Record<string, unknown> = {},
): AuctionValidator {
  return {
    voteAccount: 'test',
    bondGoodForNEpochs: 20,
    bondBalanceSol: 100,
    marinadeActivatedStakeSol: 10000,
    maxStakeWanted: 50000,
    auctionStake: { marinadeSamTargetSol: 15000 },
    revShare: {
      inflationPmpe: 5,
      mevPmpe: 2,
      blockPmpe: 1,
      bidPmpe: 3,
      totalPmpe: 11,
      bondObligationPmpe: 10,
      auctionEffectiveBidPmpe: 3,
      effParticipatingBidPmpe: 3,
    },
    ...overrides,
  } as unknown as AuctionValidator
}

describe('compoundApy', () => {
  it('zero pmpe → 0', () => {
    expect(compoundApy(0, 182)).toBe(0)
  })

  it('1 pmpe, 182 epochs → ~20%', () => {
    expect(compoundApy(1, 182)).toBeCloseTo(0.1995, 3)
  })

  it('scales with pmpe (higher pmpe → higher apy)', () => {
    expect(compoundApy(3, 182)).toBeGreaterThan(compoundApy(1, 182))
  })

  it('zero epochs → 0 regardless of pmpe', () => {
    expect(compoundApy(5, 0)).toBe(0)
  })
})

describe('bondRunwayEpochs', () => {
  it('positive runway: goodFor - min', () => {
    const v = makeValidator({ bondGoodForNEpochs: 20 })
    expect(bondRunwayEpochs(v, 5)).toBe(15)
  })

  it('zero: exactly depleted', () => {
    const v = makeValidator({ bondGoodForNEpochs: 5 })
    expect(bondRunwayEpochs(v, 5)).toBe(0)
  })

  it('negative: overdrawn', () => {
    const v = makeValidator({ bondGoodForNEpochs: 3 })
    expect(bondRunwayEpochs(v, 5)).toBe(-2)
  })
})

describe('bondUtilizationPct', () => {
  it('typical utilization < 100: 3/4 epochs covered → 25%', () => {
    const v = makeValidator({ bondGoodForNEpochs: 3, bondBalanceSol: 100 })
    expect(bondUtilizationPct(v, 4)).toBe(25)
  })

  it('runway depleted → capped at 100', () => {
    const v = makeValidator({ bondGoodForNEpochs: 0, bondBalanceSol: 10 })
    expect(bondUtilizationPct(v, 5)).toBe(100)
  })

  it('zero bond → 100', () => {
    const v = makeValidator({ bondBalanceSol: 0 })
    expect(bondUtilizationPct(v, 5)).toBe(100)
  })

  it('runway exceeds min → 0%', () => {
    const v = makeValidator({ bondGoodForNEpochs: 10, bondBalanceSol: 100 })
    expect(bondUtilizationPct(v, 5)).toBe(0)
  })

  it('exactly half covered → 50%', () => {
    const v = makeValidator({ bondGoodForNEpochs: 2, bondBalanceSol: 100 })
    expect(bondUtilizationPct(v, 4)).toBe(50)
  })
})

describe('apyBreakdown', () => {
  it('all components > 0 when all pmpe > 0', () => {
    const v = makeValidator()
    const bd = apyBreakdown(v, 182)
    expect(bd.inflation).toBeGreaterThan(0)
    expect(bd.mev).toBeGreaterThan(0)
    expect(bd.blockRewards).toBeGreaterThan(0)
    expect(bd.bid).toBeGreaterThan(0)
    expect(bd.total).toBeGreaterThan(0)
  })

  it('total = compoundApy(totalPmpe)', () => {
    const v = makeValidator()
    const bd = apyBreakdown(v, 182)
    expect(bd.total).toBeCloseTo(compoundApy(11, 182), 10)
  })

  it('all zero when all pmpe = 0', () => {
    const v = makeValidator({
      revShare: {
        inflationPmpe: 0,
        mevPmpe: 0,
        blockPmpe: 0,
        bidPmpe: 0,
        totalPmpe: 0,
        bondObligationPmpe: 0,
        auctionEffectiveBidPmpe: 0,
        effParticipatingBidPmpe: 0,
      } as AuctionValidator['revShare'],
    })
    const bd = apyBreakdown(v, 182)
    expect(bd.total).toBe(0)
    expect(bd.inflation).toBe(0)
    expect(bd.mev).toBe(0)
    expect(bd.blockRewards).toBe(0)
    expect(bd.bid).toBe(0)
  })

  it('components are independent (each driven by own pmpe)', () => {
    const v = makeValidator({
      revShare: {
        inflationPmpe: 10,
        mevPmpe: 0,
        blockPmpe: 0,
        bidPmpe: 0,
        totalPmpe: 10,
        bondObligationPmpe: 0,
        auctionEffectiveBidPmpe: 0,
        effParticipatingBidPmpe: 0,
      } as AuctionValidator['revShare'],
    })
    const bd = apyBreakdown(v, 182)
    expect(bd.inflation).toBeGreaterThan(0)
    expect(bd.mev).toBe(0)
    expect(bd.bid).toBe(0)
  })
})

// B2: selectMaxProtectedStake returns Infinity for zero-bid validators
describe('B2 — selectMaxProtectedStake zero-pmpe guard', () => {
  it('returns 0 when all revShare pmpe fields are 0 (no division by zero)', () => {
    const entry: ValidatorWithBond = {
      validator: {} as ValidatorWithBond['validator'],
      bond: {
        pubkey: 'pk',
        vote_account: 'vote1',
        authority: 'auth',
        cpmpe: 0,
        updated_at: '2024-01-01',
        epoch: 700,
        funded_amount: 1000000000,
        effective_amount: 1000000000, // 1 SOL in lamports
        max_stake_wanted: 0,
        remaining_witdraw_request_amount: 0,
        remainining_settlement_claim_amount: 0,
      },
      auction: makeValidator({
        revShare: {
          inflationPmpe: 0,
          mevPmpe: 0,
          blockPmpe: 0,
          bidPmpe: 0,
          totalPmpe: 0,
          bondObligationPmpe: 0,
          auctionEffectiveBidPmpe: 0,
          effParticipatingBidPmpe: 0,
        } as AuctionValidator['revShare'],
      }),
    }
    const result = selectMaxProtectedStake(entry)
    expect(result).toBe(0)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('returns > 0 when pmpe fields are non-zero', () => {
    const entry: ValidatorWithBond = {
      validator: {} as ValidatorWithBond['validator'],
      bond: {
        pubkey: 'pk',
        vote_account: 'vote1',
        authority: 'auth',
        cpmpe: 0,
        updated_at: '2024-01-01',
        epoch: 700,
        funded_amount: 1000000000,
        effective_amount: 5000000000, // 5 SOL
        max_stake_wanted: 0,
        remaining_witdraw_request_amount: 0,
        remainining_settlement_claim_amount: 0,
      },
      auction: makeValidator(), // default has non-zero pmpe fields
    }
    const result = selectMaxProtectedStake(entry)
    expect(result).toBeGreaterThan(0)
  })
})

// B3: selectProjectedAPY divides by tvl which can be 0
describe('B3 — selectProjectedAPY zero-tvl guard', () => {
  it('returns 0 when marinadeSamTvlSol is 0', () => {
    const auctionResult = makeAuctionResult(0, [
      {
        marinadeActivatedStakeSol: 1000,
        revShare: {
          auctionEffectiveBidPmpe: 5,
          inflationPmpe: 3,
          mevPmpe: 2,
        },
      } as Partial<AuctionValidator>,
    ])
    const result = selectProjectedAPY(auctionResult, 182)
    expect(result).toBe(0)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('returns a finite positive value when tvl > 0', () => {
    const auctionResult = makeAuctionResult(100000, [
      {
        marinadeActivatedStakeSol: 1000,
        revShare: {
          auctionEffectiveBidPmpe: 5,
          inflationPmpe: 3,
          mevPmpe: 2,
        },
      } as Partial<AuctionValidator>,
    ])
    const result = selectProjectedAPY(auctionResult, 182)
    expect(result).toBeGreaterThan(0)
    expect(Number.isFinite(result)).toBe(true)
  })
})

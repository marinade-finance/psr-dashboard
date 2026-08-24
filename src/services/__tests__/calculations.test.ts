// Tests for blockRewardsSharedFrac, bondGaugeScaleMax, bondGaugeCriticalFrac, bondUtilizationPct, effectiveBondRunway.
import { describe, it, expect } from 'vitest'

import { bondUtilizationPct, effectiveBondRunway } from '../bond-health'
import {
  blockRewardsSharedFrac,
  bondGaugeScaleMax,
  bondGaugeCriticalFrac,
} from '../calculations'
import { selectMaxProtectedStake } from '../validator-with-bond'

import type { ValidatorWithBond } from '../validator-with-bond'
import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

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

describe('blockRewardsSharedFrac', () => {
  // The label shows the share GIVEN to stakers; the value must stay consistent
  // with the SDK's blockPmpe = rawBlock × (1 − commission), which is 0 when
  // commission is null or ≥ 1.
  it('commission 0 → 100% shared', () => {
    expect(blockRewardsSharedFrac(0)).toBe(1)
  })

  it('commission 0.5 → 50% shared', () => {
    expect(blockRewardsSharedFrac(0.5)).toBe(0.5)
  })

  it('commission 0.05 → 95% shared', () => {
    expect(blockRewardsSharedFrac(0.05)).toBeCloseTo(0.95, 9)
  })

  it('commission 0.99 → 1% shared', () => {
    expect(blockRewardsSharedFrac(0.99)).toBeCloseTo(0.01, 9)
  })

  it('commission 1 (100% kept) → 0% shared', () => {
    expect(blockRewardsSharedFrac(1)).toBe(0)
  })

  it('null commission → 0% shared', () => {
    expect(blockRewardsSharedFrac(null)).toBe(0)
  })

  it('shared > 0 exactly when the SDK would credit blockPmpe', () => {
    // calculatePmpe returns 0 iff commission is null or ≥ 1; the shared label
    // must read 0% under exactly those inputs and positive otherwise.
    for (const c of [0, 0.05, 0.5, 0.99]) {
      expect(blockRewardsSharedFrac(c)).toBeGreaterThan(0)
    }
    for (const c of [1, 1.5, null]) {
      expect(blockRewardsSharedFrac(c)).toBe(0)
    }
  })
})

describe('bondUtilizationPct', () => {
  it('typical utilization < 100: 3/4 epochs covered → 25%', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 3,
      bondBalanceSol: 100,
    })
    expect(bondUtilizationPct(validator, 4)).toBe(25)
  })

  it('runway depleted → capped at 100', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 0,
      bondBalanceSol: 10,
    })
    expect(bondUtilizationPct(validator, 5)).toBe(100)
  })

  it('zero bond → 100', () => {
    const validator = makeValidator({ bondBalanceSol: 0 })
    expect(bondUtilizationPct(validator, 5)).toBe(100)
  })

  it('runway exceeds min → 0%', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 10,
      bondBalanceSol: 100,
    })
    expect(bondUtilizationPct(validator, 5)).toBe(0)
  })

  it('exactly half covered → 50%', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 2,
      bondBalanceSol: 100,
    })
    expect(bondUtilizationPct(validator, 4)).toBe(50)
  })

  it('minBondEpochs=0 → 100 (misconfig surfaces as fully depleted)', () => {
    const v = makeValidator({ bondBalanceSol: 50, bondGoodForNEpochs: 3 })
    expect(bondUtilizationPct(v, 0)).toBe(100)
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
        cpmpe: '0',
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
        },
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
        cpmpe: '0',
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

describe('effectiveBondRunway', () => {
  const cfg = { minBondBalanceSol: 10 } as DsSamConfig
  const v = (bondBalanceSol: number, bondGoodForNEpochs?: number) =>
    ({
      voteAccount: 'v',
      bondBalanceSol,
      bondGoodForNEpochs,
    }) as unknown as AuctionValidator

  it('bond below minBondBalanceSol → 0', () => {
    expect(effectiveBondRunway(v(5, 15), cfg)).toBe(0)
  })

  it('no bond → 0', () => {
    expect(effectiveBondRunway(v(0, 15), cfg)).toBe(0)
  })

  it('bond at minBondBalanceSol → raw runway', () => {
    expect(effectiveBondRunway(v(10, 15), cfg)).toBe(15)
  })

  it('bond above minBondBalanceSol → raw runway', () => {
    expect(effectiveBondRunway(v(100, 15), cfg)).toBe(15)
  })

  it('bondGoodForNEpochs undefined → 0', () => {
    expect(effectiveBondRunway(v(100, undefined), cfg)).toBe(0)
  })

  it('negative bondGoodForNEpochs → 0', () => {
    expect(effectiveBondRunway(v(100, -5), cfg)).toBe(0)
  })
})

describe('bondGaugeScaleMax', () => {
  it('scale = 4 × idealBondEpochs', () => {
    const cfg = { idealBondEpochs: 10 } as DsSamConfig
    expect(bondGaugeScaleMax(cfg)).toBe(40)
  })

  it('zero idealBondEpochs → 0', () => {
    const cfg = { idealBondEpochs: 0 } as DsSamConfig
    expect(bondGaugeScaleMax(cfg)).toBe(0)
  })
})

describe('bondGaugeCriticalFrac', () => {
  it('always 0.5 — 2 × idealBondEpochs / (4 × idealBondEpochs)', () => {
    const cfg = { minBondEpochs: 2, idealBondEpochs: 10 } as DsSamConfig
    // 2*10 / 40 = 0.5
    expect(bondGaugeCriticalFrac(cfg)).toBeCloseTo(0.5, 9)
  })

  it('minBondEpochs does not affect the result', () => {
    const cfg = { minBondEpochs: 0, idealBondEpochs: 10 } as DsSamConfig
    expect(bondGaugeCriticalFrac(cfg)).toBe(0.5)
  })

  it('idealBondEpochs=0 → falls back to 0.5 sentinel', () => {
    const cfg = { minBondEpochs: 2, idealBondEpochs: 0 } as DsSamConfig
    // bondGaugeScaleMax=0 → max > 0 is false → 0.5
    expect(bondGaugeCriticalFrac(cfg)).toBe(0.5)
  })
})

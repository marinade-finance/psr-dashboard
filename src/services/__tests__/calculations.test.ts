import { describe, it, expect } from 'vitest'

import { Color } from 'src/components/table/table'

import {
  compoundApy,
  bondRunwayEpochs,
  bondRunwayDays,
  bondUtilizationPct,
  getBondHealth,
  bondHealthColor,
  stakeDelta,
  apyBreakdown,
  isNonProductive,
} from '../calculations'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

function makeValidator(
  overrides: Partial<AuctionValidator> = {},
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
  it('returns 0 for zero pmpe', () => {
    expect(compoundApy(0, 182)).toBe(0)
  })

  it('typical: 1 pmpe, 182 epochs', () => {
    const result = compoundApy(1, 182)
    expect(result).toBeCloseTo(0.1995, 3)
  })

  it('3 pmpe, 182 epochsPerYear', () => {
    const result = compoundApy(3, 182)
    expect(result).toBeGreaterThan(0.7)
    expect(result).toBeLessThan(1.5)
  })
})

describe('bondRunwayEpochs', () => {
  it('positive runway', () => {
    const v = makeValidator({ bondGoodForNEpochs: 20 })
    expect(bondRunwayEpochs(v, 5)).toBe(15)
  })

  it('zero (exactly depleted)', () => {
    const v = makeValidator({ bondGoodForNEpochs: 5 })
    expect(bondRunwayEpochs(v, 5)).toBe(0)
  })

  it('negative (overdrawn)', () => {
    const v = makeValidator({ bondGoodForNEpochs: 3 })
    expect(bondRunwayEpochs(v, 5)).toBe(-2)
  })
})

describe('bondRunwayDays', () => {
  it('uses 48h epoch, not 52h', () => {
    expect(bondRunwayDays(1)).toBe(2)
  })

  it('10 epochs → 20 days', () => {
    expect(bondRunwayDays(10)).toBe(20)
  })

  it('0 epochs → 0 days', () => {
    expect(bondRunwayDays(0)).toBe(0)
  })
})

describe('bondUtilizationPct', () => {
  it('typical utilization', () => {
    const v = makeValidator({
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 250000,
    })
    expect(bondUtilizationPct(v)).toBe(50)
  })

  it('capped at 100', () => {
    const v = makeValidator({
      bondBalanceSol: 10,
      marinadeActivatedStakeSol: 999999,
    })
    expect(bondUtilizationPct(v)).toBe(100)
  })

  it('zero bond → 100', () => {
    const v = makeValidator({
      bondBalanceSol: 0,
      marinadeActivatedStakeSol: 1000,
    })
    expect(bondUtilizationPct(v)).toBe(100)
  })
})

describe('getBondHealth', () => {
  it('critical: epochsRunway <= 5', () => {
    expect(getBondHealth(0, 5)).toBe('critical')
    expect(getBondHealth(0, 4)).toBe('critical')
  })

  it('critical: bondUtilPct >= 85', () => {
    expect(getBondHealth(85, 20)).toBe('critical')
    expect(getBondHealth(90, 20)).toBe('critical')
  })

  it('watch: epochsRunway <= 10 (but > 5)', () => {
    expect(getBondHealth(0, 10)).toBe('watch')
    expect(getBondHealth(0, 6)).toBe('watch')
  })

  it('watch: bondUtilPct >= 65 (but < 85)', () => {
    expect(getBondHealth(65, 20)).toBe('watch')
    expect(getBondHealth(84, 20)).toBe('watch')
  })

  it('healthy: well within bounds', () => {
    expect(getBondHealth(50, 20)).toBe('healthy')
  })

  it('boundary: exactly 11 epochs, 64% util → healthy', () => {
    expect(getBondHealth(64, 11)).toBe('healthy')
  })
})

describe('bondHealthColor', () => {
  it('no target → undefined', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    expect(bondHealthColor(v, 5)).toBeUndefined()
  })

  it('health >= 13 → GREEN', () => {
    const v = makeValidator({ bondGoodForNEpochs: 20 })
    expect(bondHealthColor(v, 5)).toBe(Color.GREEN)
  })

  it('health 6-12 → YELLOW', () => {
    const v = makeValidator({ bondGoodForNEpochs: 11 })
    expect(bondHealthColor(v, 4)).toBe(Color.YELLOW)
  })

  it('health 2-5 → ORANGE', () => {
    const v = makeValidator({ bondGoodForNEpochs: 6 })
    expect(bondHealthColor(v, 4)).toBe(Color.ORANGE)
  })

  it('health < 2 → RED', () => {
    const v = makeValidator({ bondGoodForNEpochs: 5 })
    expect(bondHealthColor(v, 4)).toBe(Color.RED)
  })
})

describe('stakeDelta', () => {
  it('gaining stake', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 20000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(10000)
  })

  it('losing stake', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(-5000)
  })

  it('at target', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(0)
  })
})

describe('apyBreakdown', () => {
  it('components present for all fields', () => {
    const v = makeValidator()
    const breakdown = apyBreakdown(v, 182)
    expect(breakdown.inflation).toBeGreaterThan(0)
    expect(breakdown.mev).toBeGreaterThan(0)
    expect(breakdown.blockRewards).toBeGreaterThan(0)
    expect(breakdown.bid).toBeGreaterThan(0)
    expect(breakdown.total).toBeGreaterThan(0)
  })

  it('total matches compoundApy of totalPmpe', () => {
    const v = makeValidator()
    const breakdown = apyBreakdown(v, 182)
    const expected = compoundApy(11, 182)
    expect(Math.abs(breakdown.total - expected)).toBeLessThan(1e-10)
  })

  it('handles zero pmpe fields', () => {
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
    const breakdown = apyBreakdown(v, 182)
    expect(breakdown.total).toBe(0)
    expect(breakdown.inflation).toBe(0)
  })
})

describe('isNonProductive', () => {
  it('non-productive when bond obligation < 90% of effective bid', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 1,
        auctionEffectiveBidPmpe: 5,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(true)
  })

  it('productive when bond obligation >= 90% of effective bid', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 9,
        auctionEffectiveBidPmpe: 10,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(false)
  })

  it('boundary: exactly 90% is productive', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 9,
        auctionEffectiveBidPmpe: 10,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(false)
  })
})

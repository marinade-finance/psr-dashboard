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
  selectMaxWantedStake,
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

describe('bondRunwayDays', () => {
  // epoch = 48h per MEMORY.md and source code (not 52h)
  it('1 epoch → 2 days (48h, not 52h)', () => {
    expect(bondRunwayDays(1)).toBe(2)
  })

  it('10 epochs → 20 days', () => {
    expect(bondRunwayDays(10)).toBe(20)
  })

  it('0 epochs → 0 days', () => {
    expect(bondRunwayDays(0)).toBe(0)
  })

  it('negative runway → negative days', () => {
    expect(bondRunwayDays(-3)).toBe(-6)
  })
})

describe('bondUtilizationPct', () => {
  it('typical utilization < 100', () => {
    // 10000 active / (100 * 5000) * 100 = 2%
    const v = makeValidator({
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 10000,
    })
    expect(bondUtilizationPct(v)).toBe(2)
  })

  it('capped at 100 when stake far exceeds bond', () => {
    const v = makeValidator({
      bondBalanceSol: 1,
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

  it('zero stake → 0%', () => {
    const v = makeValidator({
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 0,
    })
    expect(bondUtilizationPct(v)).toBe(0)
  })

  it('exactly at cap boundary', () => {
    // 250000 active / (100 * 5000) * 100 = 50%
    const v = makeValidator({
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 250000,
    })
    expect(bondUtilizationPct(v)).toBe(50)
  })
})

describe('getBondHealth', () => {
  // critical: epochsRunway <= 5
  it('critical: runway exactly 5', () =>
    expect(getBondHealth(0, 5)).toBe('critical'))
  it('critical: runway 0', () => expect(getBondHealth(0, 0)).toBe('critical'))
  // critical: utilPct >= 85
  it('critical: utilPct exactly 85', () =>
    expect(getBondHealth(85, 20)).toBe('critical'))
  it('critical: utilPct 100', () =>
    expect(getBondHealth(100, 20)).toBe('critical'))

  // watch: runway 6–10 (and util < 85)
  it('watch: runway exactly 10', () =>
    expect(getBondHealth(0, 10)).toBe('watch'))
  it('watch: runway 6', () => expect(getBondHealth(0, 6)).toBe('watch'))
  // watch: utilPct 65–84
  it('watch: utilPct exactly 65', () =>
    expect(getBondHealth(65, 20)).toBe('watch'))
  it('watch: utilPct 84', () => expect(getBondHealth(84, 20)).toBe('watch'))

  // healthy: runway > 10, util < 65
  it('healthy: 64% util, 11 epochs', () =>
    expect(getBondHealth(64, 11)).toBe('healthy'))
  it('healthy: 0% util, 100 epochs', () =>
    expect(getBondHealth(0, 100)).toBe('healthy'))
})

describe('bondHealthColor', () => {
  it('no target (0) → undefined', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    expect(bondHealthColor(v, 5)).toBeUndefined()
  })

  it('runway >= 13 → GREEN', () => {
    // bondGoodForNEpochs:20, minBond:5 → runway 15
    const v = makeValidator({ bondGoodForNEpochs: 20 })
    expect(bondHealthColor(v, 5)).toBe(Color.GREEN)
  })

  it('runway exactly 13 → GREEN', () => {
    const v = makeValidator({ bondGoodForNEpochs: 18 })
    expect(bondHealthColor(v, 5)).toBe(Color.GREEN)
  })

  it('runway 6–12 → YELLOW', () => {
    // bondGoodForNEpochs:15, minBond:5 → runway 10
    const v = makeValidator({ bondGoodForNEpochs: 15 })
    expect(bondHealthColor(v, 5)).toBe(Color.YELLOW)
  })

  it('runway exactly 6 → YELLOW', () => {
    const v = makeValidator({ bondGoodForNEpochs: 11 })
    expect(bondHealthColor(v, 5)).toBe(Color.YELLOW)
  })

  it('runway 2–5 → ORANGE', () => {
    // bondGoodForNEpochs:7, minBond:4 → runway 3
    const v = makeValidator({ bondGoodForNEpochs: 7 })
    expect(bondHealthColor(v, 4)).toBe(Color.ORANGE)
  })

  it('runway exactly 2 → ORANGE', () => {
    const v = makeValidator({ bondGoodForNEpochs: 6 })
    expect(bondHealthColor(v, 4)).toBe(Color.ORANGE)
  })

  it('runway < 2 → RED', () => {
    // bondGoodForNEpochs:5, minBond:4 → runway 1
    const v = makeValidator({ bondGoodForNEpochs: 5 })
    expect(bondHealthColor(v, 4)).toBe(Color.RED)
  })

  it('runway exactly 0 → RED', () => {
    const v = makeValidator({ bondGoodForNEpochs: 4 })
    expect(bondHealthColor(v, 4)).toBe(Color.RED)
  })

  it('negative runway → RED', () => {
    const v = makeValidator({ bondGoodForNEpochs: 2 })
    expect(bondHealthColor(v, 4)).toBe(Color.RED)
  })
})

describe('stakeDelta', () => {
  it('gaining stake: target > active', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 20000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(10000)
  })

  it('losing stake: target < active', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(-5000)
  })

  it('at target: delta 0', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(0)
  })

  it('not in set (target=0): large negative delta', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
      marinadeActivatedStakeSol: 10000,
    })
    expect(stakeDelta(v)).toBe(-10000)
  })
})

describe('selectMaxWantedStake', () => {
  it('returns maxStakeWanted directly', () => {
    const v = makeValidator({ maxStakeWanted: 75000 })
    expect(selectMaxWantedStake(v)).toBe(75000)
  })

  it('zero maxStakeWanted', () => {
    const v = makeValidator({ maxStakeWanted: 0 })
    expect(selectMaxWantedStake(v)).toBe(0)
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

describe('isNonProductive', () => {
  it('non-productive: bondObligation far below 90% of effectiveBid', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 1,
        auctionEffectiveBidPmpe: 5,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(true)
  })

  it('productive: bondObligation >= 90% of effectiveBid', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 9,
        auctionEffectiveBidPmpe: 10,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(false)
  })

  it('boundary: exactly 90% is productive (strict <)', () => {
    // 90% of 10 = 9, obligation=9 → not non-productive (9 < 9 is false)
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 9,
        auctionEffectiveBidPmpe: 10,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(false)
  })

  it('just below 90% boundary → non-productive', () => {
    // 89.9% of 10 = 8.99; obligation=8.99 → 8.99 < 9 → true
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 8.99,
        auctionEffectiveBidPmpe: 10,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(true)
  })

  it('zero effectiveBid → not non-productive (0 < 0 is false)', () => {
    const v = makeValidator({
      revShare: {
        bondObligationPmpe: 0,
        auctionEffectiveBidPmpe: 0,
      } as AuctionValidator['revShare'],
    })
    expect(isNonProductive(v)).toBe(false)
  })
})

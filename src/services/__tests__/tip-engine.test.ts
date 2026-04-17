import { describe, it, expect } from 'vitest'

import {
  getValidatorTip,
  getApyBreakdown,
  getBondHealthStyle,
  getTipStyle,
  formatStakeDelta,
  calculateBondUtilization,
  calculateMaxApy,
} from '../tip-engine'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

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
      bidPmpe: 20,
      totalPmpe: 28,
      bondObligationPmpe: 20,
      auctionEffectiveBidPmpe: 20,
      effParticipatingBidPmpe: 20,
    },
    ...overrides,
  } as unknown as AuctionValidator
}

const EPOCHS_PER_YEAR = 182

// --- calculateBondUtilization ---

describe('calculateBondUtilization', () => {
  it('delegates to bondUtilizationPct: 10k active / (100 * 5000) * 100 = 2%', () => {
    const v = makeValidator({
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 10000,
    })
    expect(calculateBondUtilization(v)).toBe(2)
  })

  it('zero bond → 100', () => {
    const v = makeValidator({
      bondBalanceSol: 0,
      marinadeActivatedStakeSol: 1000,
    })
    expect(calculateBondUtilization(v)).toBe(100)
  })
})

// --- calculateMaxApy ---

describe('calculateMaxApy', () => {
  it('returns compoundApy of totalPmpe', () => {
    const v = makeValidator()
    // totalPmpe = 28
    const expected = Math.pow(1 + 28 / 1e3, EPOCHS_PER_YEAR) - 1
    expect(calculateMaxApy(v, EPOCHS_PER_YEAR)).toBeCloseTo(expected, 10)
  })

  it('zero totalPmpe → 0', () => {
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
      },
    })
    expect(calculateMaxApy(v, EPOCHS_PER_YEAR)).toBe(0)
  })
})

// --- getApyBreakdown ---

describe('getApyBreakdown', () => {
  it('has all expected keys', () => {
    const v = makeValidator()
    const bd = getApyBreakdown(v, EPOCHS_PER_YEAR)
    expect(bd).toHaveProperty('inflation')
    expect(bd).toHaveProperty('mev')
    expect(bd).toHaveProperty('blockRewards')
    expect(bd).toHaveProperty('stakeBid')
    expect(bd).toHaveProperty('total')
  })

  it('stakeBid maps to bid pmpe (not named "bid")', () => {
    const v = makeValidator()
    const bd = getApyBreakdown(v, EPOCHS_PER_YEAR)
    expect(bd.stakeBid).toBeGreaterThan(0)
    expect((bd as Record<string, unknown>).bid).toBeUndefined()
  })

  it('total = compoundApy(totalPmpe)', () => {
    const v = makeValidator()
    const bd = getApyBreakdown(v, EPOCHS_PER_YEAR)
    const expected = Math.pow(1 + 28 / 1e3, EPOCHS_PER_YEAR) - 1
    expect(bd.total).toBeCloseTo(expected, 10)
  })
})

// --- getBondHealthStyle ---

describe('getBondHealthStyle', () => {
  it('critical → destructive color', () => {
    const s = getBondHealthStyle('critical')
    expect(s.color).toContain('destructive')
    expect(s.label).toBe('Critical')
  })

  it('watch → warning color', () => {
    const s = getBondHealthStyle('watch')
    expect(s.color).toContain('warning')
    expect(s.label).toBe('Watch')
  })

  it('healthy → primary color', () => {
    const s = getBondHealthStyle('healthy')
    expect(s.color).toContain('primary')
    expect(s.label).toBe('Healthy')
  })
})

// --- getTipStyle ---

describe('getTipStyle', () => {
  it('critical → destructive', () => {
    expect(getTipStyle('critical').color).toContain('destructive')
  })

  it('warning → warning', () => {
    expect(getTipStyle('warning').color).toContain('warning')
  })

  it('info → info', () => {
    expect(getTipStyle('info').color).toContain('info')
  })

  it('positive → primary', () => {
    expect(getTipStyle('positive').color).toContain('primary')
  })

  it('neutral → muted', () => {
    expect(getTipStyle('neutral').color).toContain('muted')
  })

  it('each urgency has non-empty icon', () => {
    const urgencies = [
      'critical',
      'warning',
      'info',
      'positive',
      'neutral',
    ] as const
    for (const u of urgencies) {
      expect(getTipStyle(u).icon.length).toBeGreaterThan(0)
    }
  })
})

// --- formatStakeDelta ---

describe('formatStakeDelta', () => {
  it('not in set (target=0) → dash text, no arrow', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    const r = formatStakeDelta(v)
    expect(r.text).toBe('—')
    expect(r.arrow).toBe('')
  })

  it('gaining stake → positive formatted with +', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 20000 },
      marinadeActivatedStakeSol: 10000,
    })
    const r = formatStakeDelta(v)
    expect(r.text).toContain('+')
    expect(r.arrow).toBe('↑')
  })

  it('losing stake → negative, destructive color, down arrow', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    const r = formatStakeDelta(v)
    expect(r.text).not.toContain('+')
    expect(r.color).toContain('destructive')
    expect(r.arrow).toBe('↓')
  })

  it('at target (delta=0) → "0", neutral color, right arrow', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    const r = formatStakeDelta(v)
    expect(r.text).toBe('0')
    expect(r.arrow).toBe('→')
  })
})

// --- getValidatorTip — all priority branches ---

describe('getValidatorTip', () => {
  it('not in set → critical/rank', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    const tip = getValidatorTip(v, 0.15, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toContain('Outside winning set')
  })

  it('critical health + epochs <= 5 → critical/bond with epoch count and days (48h)', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 1,
      marinadeActivatedStakeSol: 999999,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('Bond depletes')
    // 4 epochs × 48h / 24h = 8 days (NOT 52h math)
    expect(tip.text).toContain('8d')
  })

  it('critical health (high util, epochs > 5) → critical/bond util message', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 1,
      marinadeActivatedStakeSol: 999999,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('utilization')
  })

  it('watch + bidPmpe < 15 → warning/bid', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 10000,
      revShare: {
        inflationPmpe: 5,
        mevPmpe: 2,
        blockPmpe: 1,
        bidPmpe: 10,
        totalPmpe: 18,
        bondObligationPmpe: 10,
        auctionEffectiveBidPmpe: 10,
        effParticipatingBidPmpe: 10,
      },
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bid')
    expect(tip.text).toContain('below median')
  })

  it('watch + bidPmpe >= 15 → warning/bond runway', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('runway')
  })

  it('healthy + low bid (< 10 pmpe) + large delta (> 50k) → info/bid', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 100000 },
      marinadeActivatedStakeSol: 40000,
      revShare: {
        inflationPmpe: 5,
        mevPmpe: 2,
        blockPmpe: 1,
        bidPmpe: 5,
        totalPmpe: 13,
        bondObligationPmpe: 10,
        auctionEffectiveBidPmpe: 5,
        effParticipatingBidPmpe: 5,
      },
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('bid')
  })

  it('healthy + delta > 100k → positive/none large gain', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 200000 },
      marinadeActivatedStakeSol: 50000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('positive')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Gaining')
  })

  it('healthy + small gain (0 < delta <= 100k) with strong runway (> 20 epochs) → positive, "Strong runway"', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 25,
      auctionStake: { marinadeSamTargetSol: 15000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('positive')
    expect(tip.text).toContain('Strong runway')
  })

  it('healthy + small gain with weak runway (<= 20 epochs) → positive, "Monitor bond"', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 15,
      auctionStake: { marinadeSamTargetSol: 15000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('positive')
    expect(tip.text).toContain('Monitor bond')
  })

  it('delta === 0 → neutral/none at-target message', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('neutral')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('At target')
  })

  it('delta < 0 → critical/bid losing stake message', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, EPOCHS_PER_YEAR)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bid')
    expect(tip.text).toContain('Losing')
  })

  it('gap text in not-in-set uses winningApy - maxApy', () => {
    // totalPmpe = 0 → maxApy ≈ 0, winningApy = 0.15 → gap ≈ "0.15"
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
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
    })
    const tip = getValidatorTip(v, 0.15, EPOCHS_PER_YEAR)
    expect(tip.text).toContain('0.15')
  })
})

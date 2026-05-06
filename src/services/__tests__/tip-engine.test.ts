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
    claimableBondBalanceSol: 100,
    marinadeActivatedStakeSol: 10000,
    maxStakeWanted: 50000,
    auctionStake: { marinadeSamTargetSol: 15000 },
    minBondPmpe: 1,
    idealBondPmpe: 6,
    minUnprotectedReserve: 0,
    idealUnprotectedReserve: 0,
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

const DS_SAM_CONFIG = {
  minBondEpochs: 0,
  idealBondEpochs: 10,
  bondRiskFeeMult: 1,
} as unknown as DsSamConfig

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
  it('not in set → warning/rank', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toContain('Out of auction')
  })

  it('critical health + epochs <= 5 → critical/bond with epoch count', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('Bond depletes')
    expect(tip.text).toContain('4 epochs')
  })

  it('critical health (epochs > 5) → critical/bond penalty message', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('penalty')
  })

  it('watch → warning/bond runway', () => {
    const v = makeValidator({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('runway')
  })

  it('healthy + gaining stake → positive with SOL count', () => {
    const v = makeValidator({
      bondBalanceSol: 400,
      claimableBondBalanceSol: 400,
      auctionStake: { marinadeSamTargetSol: 200000 },
      marinadeActivatedStakeSol: 50000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('positive')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('arriving next epoch')
  })

  it('delta === 0 → neutral/none at-target message', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('neutral')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('At target')
  })

  it('delta < 0 → warning, losing stake message', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Losing')
  })
})

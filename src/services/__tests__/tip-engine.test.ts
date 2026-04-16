/**
 * Tests for tip-engine v2 logic from origin/feature/my-feature.
 * Functions are inlined here since that branch isn't merged yet.
 */
import { describe, it, expect } from 'vitest'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

// --- inlined from feature/my-feature:src/services/tip-engine.ts ---

type TipUrgency = 'critical' | 'warning' | 'info' | 'positive' | 'neutral'
type TipConstraint = 'rank' | 'bond' | 'bid' | 'none'

interface ValidatorTip {
  text: string
  urgency: TipUrgency
  constraint: TipConstraint
}

const EPOCH_HOURS = 52

function getBondHealth(
  bondUtilPct: number,
  epochsRunway: number,
): 'healthy' | 'watch' | 'critical' {
  if (epochsRunway <= 5 || bondUtilPct >= 85) return 'critical'
  if (epochsRunway <= 10 || bondUtilPct >= 65) return 'watch'
  return 'healthy'
}

function calculateBondUtilization(validator: AuctionValidator): number {
  const bondBalance = validator.bondBalanceSol
  const samActive = validator.marinadeActivatedStakeSol
  if (bondBalance <= 0) return 100
  return Math.min((samActive / (bondBalance * 5000)) * 100, 100)
}

function calculateMaxApy(
  validator: AuctionValidator,
  epochsPerYear: number,
): number {
  return Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1
}

function getValidatorTip(
  validator: AuctionValidator,
  winningApy: number,
  epochsPerYear: number,
): ValidatorTip {
  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const samActive = validator.marinadeActivatedStakeSol
  const samTarget = validator.auctionStake.marinadeSamTargetSol
  const delta = samTarget - samActive
  const bondGoodForEpochs = validator.bondGoodForNEpochs ?? 0
  const bondUtilPct = calculateBondUtilization(validator)
  const health = getBondHealth(bondUtilPct, bondGoodForEpochs)
  const maxApy = calculateMaxApy(validator, epochsPerYear)
  const bidPmpe = validator.revShare.bidPmpe

  if (!inSet) {
    const gap = (winningApy - maxApy).toFixed(2)
    return {
      text: `Outside winning set. Increase bid by ~${gap}% or lower commission to qualify.`,
      urgency: 'critical',
      constraint: 'rank',
    }
  }

  if (health === 'critical' && bondGoodForEpochs <= 5) {
    const days = Math.round((bondGoodForEpochs * EPOCH_HOURS) / 24)
    return {
      text: `Bond depletes in ~${bondGoodForEpochs} epochs (${days}d). Top up to avoid forced unstaking.`,
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'critical') {
    return {
      text: 'Bond utilization >85%. Top up bond or reduce WANT to lower exposure.',
      urgency: 'critical',
      constraint: 'bond',
    }
  }

  if (health === 'watch' && bidPmpe < 15) {
    return {
      text: `Bid at ${(bidPmpe / 10).toFixed(2)}% is below median. Raise to 0.15-0.25% to gain rank.`,
      urgency: 'warning',
      constraint: 'bid',
    }
  }

  if (health === 'watch') {
    return {
      text: `Bond runway ~${bondGoodForEpochs} epochs. Consider topping up before next cycle.`,
      urgency: 'warning',
      constraint: 'bond',
    }
  }

  if (bidPmpe < 10 && delta > 50000) {
    return {
      text: `Low bid limits rank. Raising could gain ~${(delta / 1000).toFixed(0)}K SOL more stake.`,
      urgency: 'info',
      constraint: 'bid',
    }
  }

  if (delta > 100000) {
    return {
      text: `Gaining +${(delta / 1000).toFixed(0)}K SOL stake next epoch. Bond and bid well-positioned.`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta > 0) {
    const runwayNote =
      bondGoodForEpochs > 20 ? 'Strong runway.' : 'Monitor bond.'
    return {
      text: `On track: +${delta.toLocaleString()} SOL incoming. ${runwayNote}`,
      urgency: 'positive',
      constraint: 'none',
    }
  }

  if (delta === 0) {
    return {
      text: 'At target allocation. Raise bid to grow, or reduce WANT to free bond capacity.',
      urgency: 'neutral',
      constraint: 'none',
    }
  }

  return {
    text: `Losing ${Math.abs(delta).toLocaleString()} SOL stake. Raise bid or check if commission changed.`,
    urgency: 'critical',
    constraint: 'bid',
  }
}

// --- helpers ---

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

// --- getBondHealth tests ---

describe('getBondHealth (tip-engine v2)', () => {
  it('critical: epochsRunway = 5', () => {
    expect(getBondHealth(0, 5)).toBe('critical')
  })

  it('critical: epochsRunway = 4', () => {
    expect(getBondHealth(0, 4)).toBe('critical')
  })

  it('critical: bondUtilPct = 85', () => {
    expect(getBondHealth(85, 20)).toBe('critical')
  })

  it('critical: bondUtilPct = 90', () => {
    expect(getBondHealth(90, 20)).toBe('critical')
  })

  it('watch: epochsRunway = 10', () => {
    expect(getBondHealth(0, 10)).toBe('watch')
  })

  it('watch: bondUtilPct = 65', () => {
    expect(getBondHealth(65, 20)).toBe('watch')
  })

  it('healthy: 64% util, 11 epochs', () => {
    expect(getBondHealth(64, 11)).toBe('healthy')
  })
})

// --- getValidatorTip — all 10 priority rules ---

describe('getValidatorTip (tip-engine v2)', () => {
  const epochsPerYear = 182

  it('rule 1: not in set → critical/rank', () => {
    const v = makeValidator({ auctionStake: { marinadeSamTargetSol: 0 } })
    const tip = getValidatorTip(v, 0.15, epochsPerYear)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toContain('Outside winning set')
  })

  it('rule 2: critical health + epochs <= 5 → critical/bond with days calc using 52h', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 1,
      marinadeActivatedStakeSol: 999999,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('Bond depletes')
    const days = Math.round((4 * EPOCH_HOURS) / 24)
    expect(tip.text).toContain(`${days}d`)
  })

  it('rule 3: critical health but epochs > 5 (high util) → critical/bond util msg', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 1,
      marinadeActivatedStakeSol: 999999,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('utilization')
  })

  it('rule 4: watch + bidPmpe < 15 → warning/bid', () => {
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
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bid')
    expect(tip.text).toContain('below median')
  })

  it('rule 5: watch + bidPmpe >= 15 → warning/bond runway', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 100,
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('runway')
  })

  it('rule 6: low bid, large delta > 50k → info/bid', () => {
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
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('bid')
  })

  it('rule 7: delta > 100k → positive/none large gain msg', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 200000 },
      marinadeActivatedStakeSol: 50000,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('positive')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Gaining')
  })

  it('rule 8: delta > 0 (small gain) with strong runway → positive/none', () => {
    const v = makeValidator({
      bondGoodForNEpochs: 25,
      auctionStake: { marinadeSamTargetSol: 15000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('positive')
    expect(tip.text).toContain('Strong runway')
  })

  it('rule 9: delta === 0 → neutral/none', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 10000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('neutral')
    expect(tip.constraint).toBe('none')
  })

  it('rule 10: delta < 0 → critical/bid losing stake', () => {
    const v = makeValidator({
      auctionStake: { marinadeSamTargetSol: 5000 },
      marinadeActivatedStakeSol: 10000,
    })
    const tip = getValidatorTip(v, 0.1, epochsPerYear)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bid')
    expect(tip.text).toContain('Losing')
  })
})

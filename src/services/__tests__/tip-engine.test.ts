import { describe, it, expect } from 'vitest'

import { ICON_BID } from 'src/components/icons/icon-bid'
import { ICON_BOND } from 'src/components/icons/icon-bond'
import { ICON_DOWN } from 'src/components/icons/icon-down'
import { ICON_RANK } from 'src/components/icons/icon-rank'
import { ICON_RIGHT } from 'src/components/icons/icon-right'
import { ICON_UP } from 'src/components/icons/icon-up'

import { computeBondCoverage } from '../bond-coverage'
import { bondHealthFromAuction } from '../bond-health'
import { bondUtilizationPct } from '../calculations'
import { selectProtectedStakeReason } from '../protected-events'
import {
  getValidatorTip,
  bondAdvice,
  getApyBreakdown,
  getTipStyle,
  getTipIcon,
  nextStakeDeltaCell,
} from '../tip-engine'

import type { ProtectedEvent } from '../protected-events'
import type { AugmentedAuctionValidator } from '../sam'
import type { ValidatorTip } from '../tip-engine'
import type { DsSamConfig } from '@marinade.finance/ds-sam-sdk'

function makeValidator(
  overrides: Record<string, unknown> = {},
): AugmentedAuctionValidator {
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
    values: { expectedStakeChangeSol: 5000 },
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
  } as unknown as AugmentedAuctionValidator
}

const EPOCHS_PER_YEAR = 182

const DS_SAM_CONFIG = {
  minBondEpochs: 0,
  idealBondEpochs: 10,
  bondRiskFeeMult: 1,
  // Tiny so the existing 0.001-SOL "critical fee" fixtures stay ABOVE the
  // SDK minimum (they pin the fee branch, not the below-min branch); large
  // enough that stake(minBondBalanceSol) renders for the no-bond message.
  minBondBalanceSol: 0.0001,
} as unknown as DsSamConfig

// --- bondUtilizationPct ---

describe('bondUtilizationPct', () => {
  it('3 of 4 epochs covered → 25% utilization', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 3,
      bondBalanceSol: 100,
    })
    expect(bondUtilizationPct(validator, 4)).toBe(25)
  })

  it('zero bond → 100', () => {
    const validator = makeValidator({ bondBalanceSol: 0 })
    expect(bondUtilizationPct(validator, 5)).toBe(100)
  })
})

// --- getApyBreakdown ---

describe('getApyBreakdown', () => {
  it('has all expected keys', () => {
    const validator = makeValidator()
    const bd = getApyBreakdown(validator, EPOCHS_PER_YEAR)
    expect(bd).toHaveProperty('inflation')
    expect(bd).toHaveProperty('mev')
    expect(bd).toHaveProperty('blockRewards')
    expect(bd).toHaveProperty('stakeBid')
    expect(bd).toHaveProperty('total')
  })

  it('stakeBid maps to bid pmpe (not named "bid")', () => {
    const validator = makeValidator()
    const bd = getApyBreakdown(validator, EPOCHS_PER_YEAR)
    expect(bd.stakeBid).toBeGreaterThan(0)
    expect((bd as Record<string, unknown>).bid).toBeUndefined()
  })

  it('total = compoundApy(totalPmpe)', () => {
    const validator = makeValidator()
    const bd = getApyBreakdown(validator, EPOCHS_PER_YEAR)
    const expected = Math.pow(1 + 28 / 1e3, EPOCHS_PER_YEAR) - 1
    expect(bd.total).toBeCloseTo(expected, 10)
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

  it('no longer carries an icon (color = severity only)', () => {
    const urgencies = [
      'critical',
      'warning',
      'info',
      'positive',
      'neutral',
    ] as const
    for (const u of urgencies) {
      expect('icon' in getTipStyle(u)).toBe(false)
    }
  })
})

// --- getTipIcon — glyph = constraint/direction, never severity ---

describe('getTipIcon', () => {
  const tip = (over: Partial<ValidatorTip>): ValidatorTip => ({
    text: '',
    urgency: 'warning',
    constraint: 'none',
    delta: 0,
    ...over,
  })

  it('constraint:bond → fixed non-directional bond glyph', () => {
    expect(getTipIcon(tip({ constraint: 'bond' }))).toBe(ICON_BOND)
  })

  it('constraint:bid → fixed non-directional bid glyph', () => {
    expect(getTipIcon(tip({ constraint: 'bid' }))).toBe(ICON_BID)
  })

  it('constraint:rank → fixed non-directional rank glyph', () => {
    expect(getTipIcon(tip({ constraint: 'rank' }))).toBe(ICON_RANK)
  })

  it('constraint:none — delta>0 → up, delta<0 → down, delta=0 → right', () => {
    expect(getTipIcon(tip({ constraint: 'none', delta: 100 }))).toBe(ICON_UP)
    expect(getTipIcon(tip({ constraint: 'none', delta: -100 }))).toBe(ICON_DOWN)
    expect(getTipIcon(tip({ constraint: 'none', delta: 0 }))).toBe(ICON_RIGHT)
  })

  it('regression: a constraint glyph is NEVER the up arrow', () => {
    // The bug: warning-urgency bond/bid/rank tips rendered ICON_UP via the
    // old urgency→icon map, putting a "gain" arrow on blocked/losing rows.
    for (const c of ['bond', 'bid', 'rank'] as const) {
      const losing = tip({ constraint: c, urgency: 'warning', delta: -5000 })
      expect(getTipIcon(losing)).not.toBe(ICON_UP)
    }
  })

  it('regression: a losing in-set tip is the down arrow, never up', () => {
    const losing = tip({ constraint: 'none', urgency: 'warning', delta: -5000 })
    expect(getTipIcon(losing)).toBe(ICON_DOWN)
    expect(getTipIcon(losing)).not.toBe(ICON_UP)
  })
})

// --- getValidatorTip — all priority branches ---

describe('getValidatorTip', () => {
  it('not in set → warning/rank', () => {
    const validator = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toContain('Bid too low')
  })

  it('critical health (near-zero bond) → critical/bond risk fee message', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('bond risk fee')
    expect(tip.text).toContain('Top up')
  })

  it('critical health (epochs > 5) → critical/bond risk fee message', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('bond risk fee')
  })

  it('soft health (bond covers stake but not ideal) → info/bond top-up', () => {
    // delta must be <= 0 to isolate the soft branch: a positive delta makes
    // "top up to grow stake" contradictory, so it correctly defers to the
    // positive "arriving next epoch" message (see contradiction test below).
    const validator = makeValidator({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 0 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('Top up')
  })

  it('healthy + gaining stake → positive with SOL count', () => {
    const validator = makeValidator({
      bondBalanceSol: 400,
      claimableBondBalanceSol: 400,
      values: { expectedStakeChangeSol: 150000 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('positive')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('arriving next epoch')
  })

  it('delta === 0 → neutral/none at-target message', () => {
    const validator = makeValidator({ values: { expectedStakeChangeSol: 0 } })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('neutral')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('At target')
  })

  it('delta < 0 → warning, losing stake message', () => {
    const validator = makeValidator({
      values: { expectedStakeChangeSol: -5000 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Losing')
  })
})

// --- B8: getValidatorTip soft health gets bond CTA ---

describe('getValidatorTip soft health', () => {
  it('soft health with topUpToIdealKeep > 0 → info/bond tip', () => {
    // bondBalanceSol=50 < idealBondPmpe/1000 * stake = (6/1000)*10000 = 60
    // claimableBondBalanceSol=50 >= minBondPmpe/1000 * stake = (1/1000)*10000 = 10
    // → topUpToAvoidFee=0, topUpToKeepStake=0, topUpToIdealKeep=10 → 'soft'
    const validator = makeValidator({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 0 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('bond')
    expect(tip.urgency).toBe('info')
    expect(tip.text).toContain('SOL')
  })
})

// --- positive-delta must not be contradicted by a bond top-up CTA ---
// Bond-coverage top-ups size the bond vs *current* exposed stake; delta is
// the auction's next-epoch redelegation allocation. They're independent, so
// "soft bond + gaining stake" is a common, real state. The non-urgent
// "grow stake" advisory must defer to "+N arriving"; the genuine critical
// fee and the watch keep-stake shortfall stay ahead (the inflow neither
// pays a fee nor refills the bond, so that advice is truthful when gaining).

describe('getValidatorTip — positive delta vs bond top-up precedence', () => {
  it('soft bond + topUpToIdealKeep>0 + delta>0 → NOT the "grow stake" top-up', () => {
    // Same soft-bond shape as B8 (topUpToIdealKeep=10) but delta>0. The
    // advisory "Top up N to grow stake" would directly contradict the
    // arriving stake, so it must defer to the positive message.
    const validator = makeValidator({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 7500 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.text).not.toContain('Top up')
    expect(tip.text).not.toContain('grow stake')
    expect(tip.urgency).toBe('positive')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('arriving next epoch')
  })

  it('watch bond (topUpToKeepStake>0) + delta>0 → keeps keep-stake CTA (truthful when gaining: inflow does not refill the bond)', () => {
    // Isolate watch from critical: paidUndelegationSol shrinks the *projected*
    // exposed stake (avoid-fee basis) below what claimable covers, while the
    // *current* exposed stake (keep basis) still isn't covered.
    //   current exposed = 10000 → floorBaseKeep = (1/1000)*10000 = 10
    //   projected exposed = 10000 - 8000 = 2000 → floorBaseProj = 2
    //   claimable = 5 → topUpToAvoidFee = max(0, 2-5) = 0 (no fee)
    //                   topUpToKeepStake = max(0, 10-5) = 5 > 0 → 'watch'
    //   bondBalanceSol = 100 → topUpToIdealKeep = 0 (irrelevant)
    const validator = makeValidator({
      bondBalanceSol: 100,
      claimableBondBalanceSol: 5,
      marinadeActivatedStakeSol: 10000,
      values: {
        expectedStakeChangeSol: 7500,
        paidUndelegationSol: 8000,
        bondRiskFeeSol: 0,
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('keep your stake')
    expect(tip.delta).toBe(7500)
  })

  it('critical bond (fee) + delta>0 → keeps the critical fee CTA (inflow does not pay the fee)', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
      values: { expectedStakeChangeSol: 7500 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('Top up')
    expect(tip.delta).toBe(7500)
  })
})

// --- canonical CTA source: one string, three surfaces ---------------------
// bondAdvice() is the SINGLE source. getValidatorTip's bond branch and the
// bond-coverage breakdown statusLine BOTH derive their text from it, so for a
// given validator state the sam-table pill, the detail header and the bond
// banner show byte-identical text. We assert that boundary here, plus the
// owner's wording contract: no parentheses, carries the decisive value.

describe('bondAdvice — canonical CTA contract', () => {
  const adviceFor = (over: Record<string, unknown>) => {
    const v = makeValidator(over)
    const health = bondHealthFromAuction(v, DS_SAM_CONFIG, 100)
    const coverage = computeBondCoverage(
      v,
      DS_SAM_CONFIG.minBondEpochs,
      DS_SAM_CONFIG.idealBondEpochs,
      100,
      DS_SAM_CONFIG.bondRiskFeeMult,
    )
    return bondAdvice(
      coverage,
      health,
      (v.values as { bondRiskFeeSol?: number }).bondRiskFeeSol ?? 0,
      (DS_SAM_CONFIG as unknown as { minBondBalanceSol: number })
        .minBondBalanceSol ?? 0,
      v.bondBalanceSol ?? 0,
    )
  }

  const states: Record<string, unknown>[] = [
    { bondBalanceSol: 0, claimableBondBalanceSol: 0 }, // no-bond
    {
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    }, // critical (fee)
    {
      bondBalanceSol: 100,
      claimableBondBalanceSol: 5,
      marinadeActivatedStakeSol: 10000,
      values: { paidUndelegationSol: 8000, bondRiskFeeSol: 0 },
    }, // watch (keep stake)
    {
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
    }, // soft (grow)
    {
      bondBalanceSol: 400,
      claimableBondBalanceSol: 400,
      marinadeActivatedStakeSol: 10000,
    }, // healthy
  ]

  it('every CTA is paren-free, sentence-case, ends with a period', () => {
    for (const s of states) {
      const { text } = adviceFor(s)
      expect(text).not.toMatch(/[()]/)
      expect(text[0]).toBe(text[0].toUpperCase())
      expect(text.endsWith('.')).toBe(true)
      expect(text.length).toBeLessThanOrEqual(60)
    }
  })

  it('value-bearing CTAs carry their decisive SOL figure', () => {
    // top-up / minimum CTAs must contain a number + SOL.
    for (const s of states) {
      const { text } = adviceFor(s)
      if (
        text.startsWith('Top up') ||
        text.includes('required') ||
        text.includes('bond risk fee ')
      ) {
        expect(text).toMatch(/\d[\d,]*\s*SOL/)
      }
    }
  })

  it('no CTA is the long a3f39201 sentence', () => {
    for (const s of states) {
      const { text } = adviceFor(s)
      expect(text).not.toContain('too thin to back your stake, so')
      expect(text).not.toContain('will be undelegated')
    }
  })

  it('shared boundary: getValidatorTip bond text === bondAdvice text', () => {
    // A validator whose state resolves to a bond-constraint tip. The pill /
    // header render tip.text; the breakdown banner renders bondAdvice().text.
    // They must be the SAME string for the SAME state.
    const v = makeValidator({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 0 },
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('bond')
    const { text } = adviceFor({
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 0 },
    })
    expect(tip.text).toBe(text)
  })

  it('shared boundary: critical fee tip text === bondAdvice text', () => {
    const over = {
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
      values: { expectedStakeChangeSol: -10 },
    }
    const tip = getValidatorTip(makeValidator(over), DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toBe(adviceFor(over).text)
  })
})

describe('getValidatorTip out-of-set bond top-up rounding', () => {
  it('sub-1 SOL bond top-up rounds up to "1 SOL", never "0 SOL"', () => {
    // out-of-set (target=0) + unhealthy bond → "Bond too small for stake".
    // topUp ceils, so a tiny shortfall advises at least 1 SOL — advising a
    // rounded-down (0 SOL) top-up would leave the bond short.
    const validator = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
      marinadeActivatedStakeSol: 100,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0.001,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    if (tip.text.includes('Top up')) {
      expect(tip.text).not.toMatch(/Top up 0 SOL/)
    }
  })
})

// --- regression: -0 SOL was rendered red; anything that displays 0 SOL is
// neutral. Pure helper drives the cell tone in sam-table.tsx.

describe('nextStakeDeltaCell', () => {
  it('|delta| < 1 → neutral, no prefix (sub-SOL changes not actionable)', () => {
    expect(nextStakeDeltaCell(-0.3)).toEqual({ prefix: '', tone: 'neutral' })
    expect(nextStakeDeltaCell(0)).toEqual({ prefix: '', tone: 'neutral' })
    expect(nextStakeDeltaCell(0.4)).toEqual({ prefix: '', tone: 'neutral' })
    expect(nextStakeDeltaCell(0.9)).toEqual({ prefix: '', tone: 'neutral' })
  })

  it('delta >= 1 → positive with "+" prefix', () => {
    expect(nextStakeDeltaCell(1)).toEqual({ prefix: '+', tone: 'positive' })
    expect(nextStakeDeltaCell(1000)).toEqual({ prefix: '+', tone: 'positive' })
  })

  it('delta <= -1 → negative, no prefix', () => {
    expect(nextStakeDeltaCell(-1)).toEqual({ prefix: '', tone: 'negative' })
    expect(nextStakeDeltaCell(-1000)).toEqual({ prefix: '', tone: 'negative' })
  })
})

// --- B9: selectProtectedStakeReason handles 'Bidding' ---

describe('selectProtectedStakeReason', () => {
  it("handles 'Bidding' reason", () => {
    const event = {
      epoch: 1,
      amount: 1000,
      vote_account: 'test',
      meta: { funder: 'Marinade' },
      reason: 'Bidding',
    } as ProtectedEvent
    const result = selectProtectedStakeReason(event)
    expect(result).not.toBe('Unsupported')
    expect(result).toBe('Bidding')
  })
})

// --- B10: selectProtectedStakeReason LowCredits with expected_credits=0 ---

describe('selectProtectedStakeReason LowCredits zero guard', () => {
  it('expected_credits=0 does not produce Infinity or NaN', () => {
    const event = {
      epoch: 1,
      amount: 1000,
      vote_account: 'test',
      meta: { funder: 'Marinade' },
      reason: {
        ProtectedEvent: {
          LowCredits: {
            vote_account: 'test',
            expected_credits: 0,
            actual_credits: 0,
            commission: 0,
            expected_epr: 0,
            actual_epr: 0,
            epr_loss_bps: 0,
            stake: 1000,
          },
        },
      },
    } as ProtectedEvent
    const result = selectProtectedStakeReason(event)
    expect(result).not.toContain('Infinity')
    expect(result).not.toContain('NaN')
    expect(typeof result).toBe('string')
  })
})

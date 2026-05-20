// Tests for tip-engine: getTipStyle/getTipIcon mappings, getValidatorTip branch coverage
// (bond/bid/cap/delta CTAs, severity ordering), bondAdvice contract, and nextStakeDeltaCell.
import { describe, it, expect } from 'vitest'

import { ICON_BID } from 'src/components/icons/icon-bid'
import { ICON_BOND } from 'src/components/icons/icon-bond'
import { ICON_CAP } from 'src/components/icons/icon-cap'
import { ICON_DOWN } from 'src/components/icons/icon-down'
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
  TipUrgency,
  TipConstraint,
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
  bidTooLowPenaltyHistoryEpochs: 10,
  bidTooLowPenaltyPermittedDeviationPmpe: 0.0001,
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
  it('returns all five APY components: inflation, mev, blockRewards, staticBid, total', () => {
    const validator = makeValidator()
    const bd = getApyBreakdown(validator, EPOCHS_PER_YEAR)
    expect(bd).toHaveProperty('inflation')
    expect(bd).toHaveProperty('mev')
    expect(bd).toHaveProperty('blockRewards')
    expect(bd).toHaveProperty('staticBid')
    expect(bd).toHaveProperty('total')
  })

  it('staticBid maps to bid pmpe (not named "bid")', () => {
    const validator = makeValidator()
    const bd = getApyBreakdown(validator, EPOCHS_PER_YEAR)
    expect(bd.staticBid).toBeGreaterThan(0)
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
    expect(getTipStyle(TipUrgency.CRITICAL).color).toContain('destructive')
  })

  it('warning → warning', () => {
    expect(getTipStyle(TipUrgency.WARNING).color).toContain('warning')
  })

  it('info → info', () => {
    expect(getTipStyle(TipUrgency.INFO).color).toContain('info')
  })

  it('positive → primary', () => {
    expect(getTipStyle(TipUrgency.POSITIVE).color).toContain('primary')
  })

  it('neutral → muted', () => {
    expect(getTipStyle(TipUrgency.NEUTRAL).color).toContain('muted')
  })

  it('getTipStyle returns color and bg fields, no icon', () => {
    const urgencies = [
      TipUrgency.CRITICAL,
      TipUrgency.WARNING,
      TipUrgency.INFO,
      TipUrgency.POSITIVE,
      TipUrgency.NEUTRAL,
    ]
    for (const u of urgencies) {
      expect('icon' in getTipStyle(u)).toBe(false)
    }
  })
})

// --- getTipIcon — glyph = constraint/direction, never severity ---

describe('getTipIcon', () => {
  const tip = (over: Partial<ValidatorTip>): ValidatorTip => ({
    text: '',
    urgency: TipUrgency.WARNING,
    constraint: TipConstraint.NONE,
    delta: 0,
    ...over,
  })

  it('constraint:bond → fixed non-directional bond glyph', () => {
    expect(getTipIcon(tip({ constraint: TipConstraint.BOND }))).toBe(ICON_BOND)
  })

  it('constraint:bid → fixed non-directional bid glyph', () => {
    expect(getTipIcon(tip({ constraint: TipConstraint.BID }))).toBe(ICON_BID)
  })

  it('constraint:rank → fixed non-directional rank glyph', () => {
    expect(getTipIcon(tip({ constraint: TipConstraint.RANK }))).toBe(ICON_BID)
  })

  it('constraint:cap → fixed non-directional cap glyph', () => {
    expect(getTipIcon(tip({ constraint: TipConstraint.CAP }))).toBe(ICON_CAP)
  })

  it('constraint:none — delta>0 → up, delta<0 → down, delta=0 → right', () => {
    expect(
      getTipIcon(tip({ constraint: TipConstraint.NONE, delta: 100 })),
    ).toBe(ICON_UP)
    expect(
      getTipIcon(tip({ constraint: TipConstraint.NONE, delta: -100 })),
    ).toBe(ICON_DOWN)
    expect(getTipIcon(tip({ constraint: TipConstraint.NONE, delta: 0 }))).toBe(
      ICON_RIGHT,
    )
  })

  it('bond/bid/rank constraint → glyph is never ICON_UP even when losing stake', () => {
    for (const c of [
      TipConstraint.BOND,
      TipConstraint.BID,
      TipConstraint.RANK,
    ]) {
      const losing = tip({
        constraint: c,
        urgency: TipUrgency.WARNING,
        delta: -5000,
      })
      expect(getTipIcon(losing)).not.toBe(ICON_UP)
    }
  })

  it('constraint NONE + delta < 0 → ICON_DOWN', () => {
    const losing = tip({
      constraint: TipConstraint.NONE,
      urgency: TipUrgency.WARNING,
      delta: -5000,
    })
    expect(getTipIcon(losing)).toBe(ICON_DOWN)
    expect(getTipIcon(losing)).not.toBe(ICON_UP)
  })
})

// --- getValidatorTip — all priority branches ---

describe('getValidatorTip', () => {
  it('not in set → info/rank (growth lever — raise bid to qualify)', () => {
    const validator = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toContain('Raise bid')
  })

  it('out-of-set + bid penalty firing → critical/bid (penalty outranks rank)', () => {
    // A validator that dropped their bid hard can be BOTH out-of-set AND
    // paying a penalty. The critical penalty CTA must win the rank warning,
    // not be masked by an early out-of-set return.
    const validator = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
      revShare: {
        ...{
          inflationPmpe: 5,
          mevPmpe: 2,
          blockPmpe: 1,
          bidPmpe: 0.5,
          totalPmpe: 8.5,
          bondObligationPmpe: 0,
          effParticipatingBidPmpe: 0.5,
          bidTooLowPenaltyPmpe: 0.5,
        },
      },
      auctions: [
        { bidPmpe: 5, effParticipatingBidPmpe: 5 },
        { bidPmpe: 5, effParticipatingBidPmpe: 5 },
        { bidPmpe: 0.5, effParticipatingBidPmpe: 0.5 },
      ],
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bid')
    expect(tip.text).toContain('Raise bid')
  })

  it('out-of-set + above-min + critical bond, no fee yet → below-threshold CTA', () => {
    // Bond is below the penalty floor (topUpToAvoidFee > 0) but the SDK
    // has not charged a fee this epoch (bondRiskFeeSol === 0). The honest
    // text is "below the penalty threshold", not "avoid the fee".
    const validator = makeValidator({
      auctionStake: { marinadeSamTargetSol: 0 },
      bondBalanceSol: 50,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('below the penalty threshold')
    expect(tip.alert).toBeFalsy()
  })

  it('critical health, claimable below floor, no fee → "below the penalty threshold"', () => {
    // topUpToAvoidFee > 0 but bondRiskFeeSol === 0 — threshold crossed but
    // no fee charged yet. Text names the threshold, not the fee.
    const validator = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('below the penalty threshold')
    expect(tip.alert).toBeFalsy()
  })

  it('critical health, claimable below floor AND fee charged → "avoid the bond risk fee"', () => {
    // Both topUpToAvoidFee > 0 AND bondRiskFeeSol > 0 — fee is real.
    // Only now does "avoid the fee" fire.
    const validator = makeValidator({
      bondGoodForNEpochs: 4,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
      values: { bondRiskFeeSol: 5 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('bond fee')
    expect(tip.alert).toBe(true)
  })

  it('critical health (epochs > 5), claimable below floor, no fee → threshold CTA', () => {
    const validator = makeValidator({
      bondGoodForNEpochs: 8,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('critical')
    expect(tip.constraint).toBe('bond')
    expect(tip.text).toContain('below the penalty threshold')
    expect(tip.alert).toBeFalsy()
  })

  it('watch health (bond covers stake but not ideal) → info/bond top-up', () => {
    // WATCH + topUpToIdealKeep > 0 is the grow lever — "Top up N to grow stake."
    // Per the severity ladder it's violet/info (more stake possible if you act),
    // not yellow (reserved for "stake is leaving"). delta must be <= 0 to
    // isolate this branch: a positive delta makes the message contradictory,
    // so it correctly defers to "arriving next epoch".
    // bondGoodForNEpochs=7 → WATCH (between minBondEpochs+BOND_URGENT_EPOCHS=3 and idealBondEpochs=10).
    const validator = makeValidator({
      bondGoodForNEpochs: 7,
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

  it('delta === 0 + active ≈ target → neutral "At target stake"', () => {
    const validator = makeValidator({
      marinadeActivatedStakeSol: 15000,
      auctionStake: { marinadeSamTargetSol: 15000 },
      values: { expectedStakeChangeSol: 0 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('neutral')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('At target')
  })

  it('delta === 0 + active << target → info/rank raise-bid (budget ran out before this validator)', () => {
    // makeValidator: active=10000, target=15000 → belowTarget=true, delta=0
    // Budget depleted by higher-priority validators; lever is the bid.
    const validator = makeValidator({ values: { expectedStakeChangeSol: 0 } })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('rank')
    expect(tip.text).toBe('Raise bid to get more stake.')
  })

  it('delta < 0 + defending + healthy bond → warning, losing stake message', () => {
    // stakeIdealFloor = (6/1000)*50000 = 300 → bond=400 gives topUpToIdealKeep=0 → HEALTHY
    // Ensures deltaCta owns the warning, not bondCta.
    const validator = makeValidator({
      bondBalanceSol: 400,
      claimableBondBalanceSol: 400,
      marinadeActivatedStakeSol: 50_000, // > NON_TRIVIAL_STAKE_SOL
      values: { expectedStakeChangeSol: -5000 }, // > NON_TRIVIAL_LOSS_SOL
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('warning')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Losing')
  })

  it('delta < 0 + not defending → info, losing stake message', () => {
    // Active at boundary (10k = not > NON_TRIVIAL_STAKE_SOL) → not defending.
    const validator = makeValidator({
      marinadeActivatedStakeSol: 10_000,
      values: { expectedStakeChangeSol: -5000 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Losing')
  })

  it('delta < 0 + binding ASO cap → info/cap, names the ASO', () => {
    const validator = makeValidator({
      values: { expectedStakeChangeSol: -3953 },
      lastCapConstraint: {
        constraintType: 'ASO',
        constraintName: 'Hetzner Online GmbH',
        totalStakeSol: 1_450_000,
        totalLeftToCapSol: 0,
        marinadeStakeSol: 1_450_000,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.urgency).toBe('info')
    expect(tip.constraint).toBe('cap')
    expect(tip.text).toContain('Hetzner Online GmbH')
    expect(tip.text).toContain('at ASO cap')
    expect(tip.text).toContain('until cap frees')
  })

  it('delta < 0 + binding country cap → reads "at country cap"', () => {
    const validator = makeValidator({
      values: { expectedStakeChangeSol: -1200 },
      lastCapConstraint: {
        constraintType: 'COUNTRY',
        constraintName: 'Germany',
        totalStakeSol: 2_000_000,
        totalLeftToCapSol: 0,
        marinadeStakeSol: 2_000_000,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('cap')
    expect(tip.text).toContain('Germany at country cap')
  })

  it('delta === 0 + binding ASO cap → info/cap "stake can\'t grow" (Velox case)', () => {
    // In-set validator blocked by a concentration cap: target > active but
    // delta=0 because the cap prevents inflow. capCta now fires for delta<=0.
    const validator = makeValidator({
      values: { expectedStakeChangeSol: 0 },
      lastCapConstraint: {
        constraintType: 'ASO',
        constraintName: 'Hetzner Online GmbH',
        totalStakeSol: 1_000_000,
        totalLeftToCapSol: 0,
        marinadeStakeSol: 1_000_000,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('cap')
    expect(tip.urgency).toBe('info')
    expect(tip.text).toContain("can't grow")
  })

  it('lastCapConstraint with headroom (totalLeftToCapSol > 0) → no cap CTA', () => {
    const validator = makeValidator({
      values: { expectedStakeChangeSol: -5000 },
      lastCapConstraint: {
        constraintType: 'ASO',
        constraintName: 'Hetzner Online GmbH',
        totalStakeSol: 1_000_000,
        totalLeftToCapSol: 50_000,
        marinadeStakeSol: 1_000_000,
        marinadeLeftToCapSol: 50_000,
        validators: [],
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('none')
    expect(tip.text).toContain('Losing')
  })

  it('delta > 0 + binding cap → cap branch does not displace positive', () => {
    const validator = makeValidator({
      values: { expectedStakeChangeSol: 5000 },
      lastCapConstraint: {
        constraintType: 'ASO',
        constraintName: 'Hetzner Online GmbH',
        totalStakeSol: 1_000_000,
        totalLeftToCapSol: 0,
        marinadeStakeSol: 1_000_000,
        marinadeLeftToCapSol: 0,
        validators: [],
      },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('none')
    expect(tip.urgency).toBe('positive')
  })
})

// --- B8: getValidatorTip watch health gets bond CTA ---

describe('getValidatorTip watch health (bond top-up lever)', () => {
  it('watch health with topUpToIdealKeep > 0, delta=0 → info/bond tip (growth lever)', () => {
    // bondBalanceSol=50 < idealBondPmpe/1000 * stake = (6/1000)*10000 = 60
    // claimableBondBalanceSol=50 >= minBondPmpe/1000 * stake = (1/1000)*10000 = 10
    // → topUpToAvoidFee=0, topUpToKeepStake=0, topUpToIdealKeep=10
    // bondGoodForNEpochs=7 → WATCH (3 < 7 < 10)
    const validator = makeValidator({
      bondGoodForNEpochs: 7,
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

  it('watch health + defending (large loss) → warning/bond "keep your stake" (beats deltaCta)', () => {
    // WATCH shape with marinadeActivatedStakeSol=50000, claimable=100:
    //   stakeKeepFloor   = (1/1000)*50000 = 50  → topUpToKeepStake   = max(0,50-100)=0
    //   bondRiskFeeFloor = (1/1000)*50000 = 50  → bondRiskFeeShortfall = 0
    //   stakeIdealFloor  = (6/1000)*50000 = 300 → topUpToIdealKeep   = max(0,300-100)=200>0
    // bondGoodForNEpochs=7 → WATCH (3 < 7 < 10)
    // delta=-33000 with active=50000 → isDefending=true.
    // bondCta escalates to WARNING so it outranks deltaCta's WARNING via
    // LEVER_ORDER (bond=0 beats none=3) and the text reflects keeping, not growing.
    const validator = makeValidator({
      bondGoodForNEpochs: 7,
      bondBalanceSol: 100,
      claimableBondBalanceSol: 100,
      marinadeActivatedStakeSol: 50000,
      values: { expectedStakeChangeSol: -33000 },
    })
    const tip = getValidatorTip(validator, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('bond')
    expect(tip.urgency).toBe('warning')
    expect(tip.text).toContain('keep your stake')
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
  it('watch bond + topUpToIdealKeep>0 + delta>0 → NOT the "grow stake" top-up', () => {
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
    //                   topUpToKeepStake = max(0, 10-5) = 5 > 0
    //   bondBalanceSol = 100 → topUpToIdealKeep = 0 (irrelevant)
    // bondGoodForNEpochs=7 → WATCH (3 < 7 < 10) so bondCta fires
    const validator = makeValidator({
      bondGoodForNEpochs: 7,
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
    const coverage = computeBondCoverage(v, DS_SAM_CONFIG, 100)
    return bondAdvice(
      coverage,
      health,
      (v.values as { bondRiskFeeSol?: number }).bondRiskFeeSol ?? 0,
      (DS_SAM_CONFIG as unknown as { minBondBalanceSol: number })
        .minBondBalanceSol ?? 0,
      v.bondBalanceSol ?? 0,
      v.marinadeActivatedStakeSol ?? 0,
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
      bondGoodForNEpochs: 1,
      bondBalanceSol: 0.001,
      claimableBondBalanceSol: 0,
      marinadeActivatedStakeSol: 100000,
      values: { bondRiskFeeSol: 5, paidUndelegationSol: 0 },
    }, // critical: fee>0 AND shortfall>0 → "Top up X or pay Y bond fee."
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

  it('WATCH + nearFeeThreshold=true → warning/yellow "avoid bond fee"', () => {
    // bondGoodForNEpochs=7 → WATCH; topUpToIdealKeep>0; no fee yet.
    const v = makeValidator({
      bondGoodForNEpochs: 7,
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
    })
    const health = bondHealthFromAuction(v, DS_SAM_CONFIG, 100)
    const coverage = computeBondCoverage(v, DS_SAM_CONFIG, 100)
    const advice = bondAdvice(
      coverage,
      health,
      0,
      (DS_SAM_CONFIG as unknown as { minBondBalanceSol: number })
        .minBondBalanceSol ?? 0,
      v.bondBalanceSol ?? 0,
      v.marinadeActivatedStakeSol ?? 0,
      true,
    )
    expect(advice.urgency).toBe('warning')
    expect(advice.text).toContain('avoid bond fee')
    expect(advice.tone).toBe('yellow')
  })

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
        text.includes('bond fee ')
      ) {
        expect(text).toMatch(/\d[\d,]*\s*SOL/)
      }
    }
  })

  it("no CTA text contains the multi-clause 'too thin to back your stake' phrasing", () => {
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
    // bondGoodForNEpochs=7 → WATCH so both paths emit a bond CTA.
    const v = makeValidator({
      bondGoodForNEpochs: 7,
      bondBalanceSol: 50,
      claimableBondBalanceSol: 50,
      marinadeActivatedStakeSol: 10000,
      values: { expectedStakeChangeSol: 0 },
    })
    const tip = getValidatorTip(v, DS_SAM_CONFIG, 100)
    expect(tip.constraint).toBe('bond')
    const { text } = adviceFor({
      bondGoodForNEpochs: 7,
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

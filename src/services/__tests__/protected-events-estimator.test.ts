import { describe, it, expect, vi } from 'vitest'

import { isProtectedEvent } from '../protected-events'
import { calculateProtectedEventEstimates } from '../protected-events-estimator'

import type { Validator, ValidatorEpoch } from '../validators'

function makeEpochStat(
  overrides: Partial<ValidatorEpoch> = {},
): ValidatorEpoch {
  return {
    epoch: 700,
    credits: 432000,
    activated_stake: '1000000000000', // 1000 SOL in lamports
    marinade_stake: '500000000000', // 500 SOL in lamports
    marinade_native_stake: '500000000000', // 500 SOL in lamports
    commission_advertised: 5,
    ...overrides,
  } as unknown as ValidatorEpoch
}

function makeValidator(overrides: Partial<Validator> = {}): Validator {
  return {
    vote_account: 'vote1',
    info_name: 'Validator One',
    marinade_stake: '500000000000',
    marinade_native_stake: '500000000000',
    activated_stake: '1000000000000',
    epoch_stats: [makeEpochStat()],
    ...overrides,
  } as unknown as Validator
}

vi.mock('../rewards', () => ({
  fetchRewards: () =>
    Promise.resolve({
      rewards_inflation_est: [[700, 70] as [number, number]],
    }),
}))

vi.mock('../validators', () => ({
  fetchValidatorsWithEpochs: () =>
    Promise.resolve({ validators: [] as Validator[] }),
}))

// B1: marinadeStake must be converted to SOL, not raw lamports
describe('B1 — marinadeStake lamport unit', () => {
  it('events have finite amounts in SOL range, not lamport range', async () => {
    // reference validator establishes targetCredits = 432000 for epoch 700
    // under-test has zero credits → full EPR loss
    // With correct SOL: marinadeStake=1000, claimAmount≈few SOL < min_settlement(1e8 lamports) → filtered out
    // With bug (raw lamports): marinadeStake≈1e12, claimAmount≈1e10 lamports → huge spurious event
    const reference = makeValidator({
      vote_account: 'ref',
      epoch_stats: [makeEpochStat({ credits: 432000 })],
    })
    const underTest = makeValidator({
      vote_account: 'under-test',
      epoch_stats: [makeEpochStat({ credits: 0 })],
    })

    const events = await calculateProtectedEventEstimates([
      reference,
      underTest,
    ])
    for (const event of events) {
      expect(Number.isFinite(event.amount)).toBe(true)
      // Amounts are lamports. With correct SOL calc, a 1000 SOL stake produces
      // amounts in the tens-of-SOL range (< 1e12 lamports).
      // With the lamport bug, marinadeStake ≈ 1e12, amounts ≈ 1e18 lamports.
      expect(event.amount).toBeLessThan(1e12)
    }
  })
})

// B5: grace_commission_increase compared in bps when value is percentage points
describe('B5 — grace_commission_increase bps unit', () => {
  it('0.5% commission increase (50 bps loss) should not produce an event', async () => {
    // 5% → 5.5% = +0.5%, eprLossBps ≈ 53 bps
    // Old code: 53 >= grace_commission_increase(1) → event produced (wrong)
    // Fixed:   53 < grace_commission_increase*100(100) → no event (correct)
    const validator = makeValidator({
      epoch_stats: [
        makeEpochStat({ epoch: 700, commission_advertised: 5.5 }),
        makeEpochStat({ epoch: 699, commission_advertised: 5.0 }),
      ],
    })

    const events = await calculateProtectedEventEstimates([validator])
    const commissionEvents = events.filter(
      e =>
        isProtectedEvent(e.reason) &&
        'CommissionIncrease' in e.reason.ProtectedEvent,
    )
    expect(commissionEvents).toHaveLength(0)
  })

  it('2% commission increase does not throw or produce NaN amounts', async () => {
    // 5% → 7% = +2%, eprLossBps ≈ 211 bps > 100 → passes grace check
    const validator = makeValidator({
      epoch_stats: [
        makeEpochStat({ epoch: 700, commission_advertised: 7 }),
        makeEpochStat({ epoch: 699, commission_advertised: 5 }),
      ],
    })

    const events = await calculateProtectedEventEstimates([validator])
    for (const event of events) {
      expect(Number.isFinite(event.amount)).toBe(true)
    }
  })
})

// B6: targetCredits undefined not guarded before buildLowCreditsProtectedEvent
describe('B6 — targetCredits undefined guard', () => {
  it('epoch with zero stake (no targetCredits entry) does not crash', async () => {
    const validator = makeValidator({
      epoch_stats: [
        makeEpochStat({ epoch: 701, activated_stake: '0', credits: 0 }),
      ],
    })

    await expect(
      calculateProtectedEventEstimates([validator]),
    ).resolves.toBeInstanceOf(Array)
  })

  it('epoch missing from targetCreditsByEpoch produces no event', async () => {
    const v1 = makeValidator({ vote_account: 'vote1' })
    const v2 = makeValidator({
      vote_account: 'vote2',
      epoch_stats: [makeEpochStat({ epoch: 800, credits: 0 })],
    })

    const events = await calculateProtectedEventEstimates([v1, v2])
    expect(events.filter(e => e.vote_account === 'vote2')).toHaveLength(0)
  })
})

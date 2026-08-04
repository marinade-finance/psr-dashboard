// GEN-8534: the validator-detail Payments tab folds every PSR estimate into a
// "Total payment" for the live epoch, but the estimator emits one row per epoch
// over a trailing 3-epoch window. These guard the selectors that keep past
// epochs — settled or not — out of that total, plus the row label that used to
// mislabel a vote-credits ratio as "Uptime".
import { describe, expect, it } from 'vitest'

import {
  selectCurrentEpochEstimates,
  selectLatestProcessedEpoch,
  selectProtectedStakeReason,
  selectUnsettledEstimates,
} from '../protected-events'

import type { ProtectedEvent } from '../protected-events'

// A LowCredits protected event — the shape both the bonds API and the estimator
// produce for a missed-credits settlement.
function makeLowCreditsEvent(
  epoch: number,
  overrides: {
    voteAccount?: string
    actualCredits?: number
    expectedCredits?: number
    amount?: number
  } = {},
): ProtectedEvent {
  const {
    voteAccount = 'vote1',
    actualCredits = 6_631_431,
    expectedCredits = 6_880_102,
    amount = 2_660_000_000,
  } = overrides
  return {
    epoch,
    amount,
    vote_account: voteAccount,
    meta: { funder: 'ValidatorBond' },
    reason: {
      ProtectedEvent: {
        LowCredits: {
          vote_account: voteAccount,
          expected_credits: expectedCredits,
          actual_credits: actualCredits,
          commission: 5,
          expected_epr: 1,
          actual_epr: 0.96,
          epr_loss_bps: 361,
          stake: 1000,
        },
      },
    },
  } as unknown as ProtectedEvent
}

describe('selectLatestProcessedEpoch', () => {
  it('returns the newest settled epoch', () => {
    expect(
      selectLatestProcessedEpoch([
        makeLowCreditsEvent(1005),
        makeLowCreditsEvent(1007),
        makeLowCreditsEvent(1006),
      ]),
    ).toBe(1007)
  })

  it('returns 0 for no settled events', () => {
    expect(selectLatestProcessedEpoch([])).toBe(0)
  })
})

describe('selectUnsettledEstimates', () => {
  it('drops estimates at or below the latest settled epoch', () => {
    const kept = selectUnsettledEstimates(
      [
        makeLowCreditsEvent(1006),
        makeLowCreditsEvent(1007),
        makeLowCreditsEvent(1008),
      ],
      1007,
    )
    expect(kept.map(e => e.epoch)).toEqual([1008])
  })

  it('keeps everything when nothing is settled yet', () => {
    const estimates = [makeLowCreditsEvent(1008), makeLowCreditsEvent(1009)]
    expect(selectUnsettledEstimates(estimates, 0)).toHaveLength(2)
  })
})

describe('selectCurrentEpochEstimates', () => {
  // The GEN-8534 report verbatim: epoch-1009 Payments tab billed 2.660 SOL for
  // an epoch-1007 estimate whose real settlement was already finalised.
  it('drops a past-epoch estimate whose settlement is already finalised', () => {
    const estimates = [makeLowCreditsEvent(1007)]
    expect(selectCurrentEpochEstimates(estimates, 1009, 1007)).toEqual([])
  })

  it('drops a past-epoch estimate even when it is not settled yet', () => {
    const estimates = [makeLowCreditsEvent(1008)]
    expect(selectCurrentEpochEstimates(estimates, 1009, 1007)).toEqual([])
  })

  it('keeps an estimate for the live epoch', () => {
    const estimates = [makeLowCreditsEvent(1009)]
    expect(selectCurrentEpochEstimates(estimates, 1009, 1007)).toHaveLength(1)
  })

  it('drops a live-epoch estimate once that epoch has settled', () => {
    const estimates = [makeLowCreditsEvent(1009)]
    expect(selectCurrentEpochEstimates(estimates, 1009, 1009)).toEqual([])
  })

  it('keeps only the live epoch out of a trailing 3-epoch window', () => {
    const estimates = [
      makeLowCreditsEvent(1007),
      makeLowCreditsEvent(1008),
      makeLowCreditsEvent(1009),
    ]
    const kept = selectCurrentEpochEstimates(estimates, 1009, 0)
    expect(kept.map(e => e.epoch)).toEqual([1009])
  })

  it('shows nothing when the live epoch is unknown', () => {
    const estimates = [makeLowCreditsEvent(1009)]
    expect(selectCurrentEpochEstimates(estimates, null, 0)).toEqual([])
  })
})

describe('selectProtectedStakeReason low-credits label', () => {
  it('names the metric and the baseline instead of calling it uptime', () => {
    const label = selectProtectedStakeReason(makeLowCreditsEvent(1007))
    expect(label).toBe('Vote credits 96.39% of network mean')
    expect(label).not.toContain('Uptime')
  })

  it('uses the same wording for DowntimeRevenueImpact', () => {
    const event = {
      ...makeLowCreditsEvent(1007),
      reason: {
        ProtectedEvent: {
          DowntimeRevenueImpact: {
            vote_account: 'vote1',
            expected_credits: 6_880_102,
            actual_credits: 6_631_431,
            commission: 5,
            expected_epr: 1,
            actual_epr: 0.96,
            epr_loss_bps: 361,
            stake: 1000,
          },
        },
      },
    } as unknown as ProtectedEvent
    expect(selectProtectedStakeReason(event)).toBe(
      'Vote credits 96.39% of network mean',
    )
  })
})

// fetchProtectedEventsWithValidators: the settled-epoch guard now comes from the
// shared selectors in protected-events.ts (GEN-8534 extracted them so the
// validator-detail Payments tab can reuse it). These lock in that the extraction
// changed nothing here — estimates at or below the newest settled epoch stay
// suppressed, and the deliberately-live current-epoch penalty recompute
// (PRs #110 / #127) still fires.
import { describe, expect, it, vi } from 'vitest'

import { fetchProtectedEventsWithValidators } from '../validator-with-protected_event'

import type * as ProtectedEventsModule from '../protected-events'
import type { ProtectedEvent } from '../protected-events'
import type { ScoringValidator } from '../scoring'
import type { Validator, ValidatorEpoch } from '../validators'
import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { QueryClient } from '@tanstack/react-query'

const VOTE = 'vote1'

function makeEpochStat(epoch: number): ValidatorEpoch {
  return {
    epoch,
    credits: 432_000,
    activated_stake: '1000000000000',
    marinade_stake: '500000000000',
    marinade_native_stake: '500000000000',
    commission_advertised: 5,
  } as unknown as ValidatorEpoch
}

function makeValidator(epochs: number[]): Validator {
  return {
    vote_account: VOTE,
    info_name: null,
    marinade_stake: '500000000000',
    marinade_native_stake: '500000000000',
    activated_stake: '1000000000000',
    epoch_stats: epochs.map(makeEpochStat),
  } as unknown as Validator
}

function makeEvent(epoch: number, amount = 1_000_000_000): ProtectedEvent {
  return {
    epoch,
    amount,
    vote_account: VOTE,
    meta: { funder: 'ValidatorBond' },
    reason: {
      ProtectedEvent: {
        LowCredits: {
          vote_account: VOTE,
          expected_credits: 432_000,
          actual_credits: 400_000,
          commission: 5,
          expected_epr: 1,
          actual_epr: 0.9,
          epr_loss_bps: 1000,
          stake: 1000,
        },
      },
    },
  } as unknown as ProtectedEvent
}

function makeScoring(epoch: number): ScoringValidator {
  return {
    epoch,
    voteAccount: VOTE,
    revShare: { bidTooLowPenaltyPmpe: 1, blacklistPenaltyPmpe: 0 },
    values: { bondRiskFeeSol: 0 },
  }
}

vi.mock('../protected-events', async importOriginal => ({
  ...(await importOriginal<typeof ProtectedEventsModule>()),
  fetchProtectedEvents: vi.fn(),
}))
vi.mock('../protected-events-estimator', () => ({
  calculateProtectedEventEstimates: vi.fn(),
}))
vi.mock('../scoring', () => ({ fetchScoring: vi.fn() }))
vi.mock('../validators', () => ({ fetchValidatorsWithEpochs: vi.fn() }))
vi.mock('../sam', () => ({ loadSam: vi.fn() }))

import { fetchProtectedEvents } from '../protected-events'
import { calculateProtectedEventEstimates } from '../protected-events-estimator'
import { fetchScoring } from '../scoring'

// The real client resolves each queryKey to a different payload; ensureQueryData
// is keyed, so the stub has to be too.
const makeQc = (validators: Validator[], auctionResult: AuctionResult) =>
  ({
    ensureQueryData: ({ queryKey }: { queryKey: unknown[] }) =>
      queryKey[0] === 'sam'
        ? Promise.resolve({ auctionResult })
        : Promise.resolve({ validators }),
  }) as unknown as QueryClient

describe('fetchProtectedEventsWithValidators settled-epoch guard', () => {
  it('keeps settled facts, suppresses estimates at or below the settled epoch', async () => {
    const validators = [makeValidator([1009, 1008, 1007])]
    const auctionResult = {
      auctionData: { validators: [] },
    } as unknown as AuctionResult

    vi.mocked(fetchProtectedEvents).mockResolvedValue({
      protected_events: [makeEvent(1007)],
    })
    vi.mocked(calculateProtectedEventEstimates).mockResolvedValue([
      makeEvent(1007),
      makeEvent(1008),
      makeEvent(1009),
    ])
    vi.mocked(fetchScoring).mockResolvedValue([])

    const result = await fetchProtectedEventsWithValidators(
      makeQc(validators, auctionResult),
    )

    const facts = result.filter(r => r.status === 'fact')
    expect(facts.map(r => r.protectedEvent.epoch)).toEqual([1007])

    const estimateEpochs = result
      .filter(r => r.status === 'estimate')
      .map(r => r.protectedEvent.epoch)
      .sort((a, b) => a - b)
    expect(estimateEpochs).toEqual([1008, 1009])
    expect(estimateEpochs).not.toContain(1007)
  })

  it('still recomputes the current-epoch auction penalty (PRs #110 / #127)', async () => {
    const validators = [makeValidator([1009, 1008, 1007])]
    // maxStatsEpoch 1009 === maxScoredEpoch 1009 → the auction covers the live
    // epoch, so its penalties come from auctionResult, not from `scoring`.
    const auctionResult = {
      auctionData: {
        validators: [
          {
            voteAccount: VOTE,
            revShare: { bidTooLowPenaltyPmpe: 2, blacklistPenaltyPmpe: 0 },
            values: { bondRiskFeeSol: 0 },
          },
        ],
      },
    } as unknown as AuctionResult

    vi.mocked(fetchProtectedEvents).mockResolvedValue({
      protected_events: [makeEvent(1007)],
    })
    vi.mocked(calculateProtectedEventEstimates).mockResolvedValue([])
    vi.mocked(fetchScoring).mockResolvedValue([
      makeScoring(1007),
      makeScoring(1008),
      makeScoring(1009),
    ])

    const result = await fetchProtectedEventsWithValidators(
      makeQc(validators, auctionResult),
    )

    const penalties = result.filter(
      r => r.protectedEvent.reason === 'BidTooLowPenalty',
    )
    const byEpoch = penalties.map(r => r.protectedEvent.epoch).sort()
    // 1007 is settled → skipped. 1008 comes from `scoring`. 1009 is the live
    // epoch and comes from the auction result.
    expect(byEpoch).toEqual([1008, 1009])

    const live = penalties.find(r => r.protectedEvent.epoch === 1009)
    // 1000 SOL of Marinade stake × 2 PMPE / 1000 = 2 SOL, in lamports.
    expect(live?.protectedEvent.amount).toBe(2_000_000_000)
  })
})

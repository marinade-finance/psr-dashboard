import { describe, expect, it, vi } from 'vitest'

import { loadPsrEstimates } from '../psr-estimates'

import type { ScoringValidator } from '../scoring'
import type { Validator } from '../validators'
import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { QueryClient } from '@tanstack/react-query'

vi.mock('../scoring', () => ({ fetchScoring: vi.fn() }))
vi.mock('../validators', () => ({ fetchValidatorsWithEpochs: vi.fn() }))
vi.mock('../sam', () => ({ loadSam: vi.fn() }))

import { fetchScoring } from '../scoring'

const EPOCH = 1009
const STAKE = '1000000000000'

type Spec = {
  vote: string
  credits: number | null
  voteReward?: number
  leaderSlots?: number
  epochStake?: number
  commissionAdvertised?: number | null
  won: boolean
  inflationCommissionDec: number
}

const validator = (s: Spec): Validator => ({
  vote_account: s.vote,
  info_name: null,
  dc_country_iso: null,
  marinade_stake: STAKE,
  marinade_native_stake: '0',
  activated_stake: STAKE,
  epoch_stats: [
    {
      epoch: EPOCH,
      credits: s.credits,
      vote_reward_lamports: s.voteReward ?? null,
      leader_slots: s.leaderSlots ?? 0,
      epoch_stake: s.epochStake ?? null,
      commission_advertised:
        s.commissionAdvertised === undefined ? 5 : s.commissionAdvertised,
      activated_stake: STAKE,
      marinade_stake: STAKE,
      marinade_native_stake: '0',
      epoch_start_at: null,
      epoch_end_at: null,
    },
  ],
})

const revShare = (s: Spec) => ({
  inflationPmpe: 1 - s.inflationCommissionDec,
  mevPmpe: 0,
  totalPmpe: s.won ? 2 : 1,
  auctionEffectiveBidPmpe: 0,
})

const scoreRow = (
  s: Spec,
  epoch: number,
  inflationCommissionDec = s.inflationCommissionDec,
): ScoringValidator => ({
  epoch,
  voteAccount: s.vote,
  marinadeSamTargetSol: s.won ? 1000 : 0,
  maxStakeWanted: null,
  revShare: {
    ...revShare(s),
    bidTooLowPenaltyPmpe: 0,
    blacklistPenaltyPmpe: 0,
  },
  values: {
    bondRiskFeeSol: 0,
    commissions: {
      inflationCommissionDec,
      mevCommissionDec: 1,
      inflationCommissionOnchainDec: inflationCommissionDec,
      inflationCommissionInBondDec: null,
      mevCommissionOnchainDec: null,
      mevCommissionInBondDec: null,
    },
  },
  metadata: { scoringId: `${epoch}.100` },
})

const auctionResult = (specs: Spec[]) =>
  ({
    winningTotalPmpe: 2,
    auctionData: {
      rewards: { inflationPmpe: 1, mevPmpe: 0.25, blockPmpe: 0 },
      validators: specs.map(s => ({
        voteAccount: s.vote,
        inflationCommissionDec: s.inflationCommissionDec,
        mevCommissionDec: null,
        maxStakeWanted: null,
        revShare: revShare(s),
      })),
    },
  }) as unknown as AuctionResult

const makeQc = (specs: Spec[]) =>
  ({
    ensureQueryData: ({ queryKey }: { queryKey: unknown[] }) =>
      queryKey[0] === 'sam'
        ? Promise.resolve({ auctionResult: auctionResult(specs) })
        : Promise.resolve({ validators: specs.map(validator) }),
  }) as unknown as QueryClient

describe('loadPsrEstimates', () => {
  it('charges a CommissionSamIncrease to a loser whose commission rose since the past epoch', async () => {
    const winner: Spec = {
      vote: 'winner',
      credits: 10_000,
      won: true,
      inflationCommissionDec: 0,
    }
    const loser: Spec = {
      vote: 'loser',
      credits: 10_000,
      won: false,
      inflationCommissionDec: 0.5,
    }
    vi.mocked(fetchScoring).mockResolvedValue([
      scoreRow(winner, EPOCH),
      scoreRow(loser, EPOCH),
      scoreRow(loser, EPOCH - 1, 0),
    ])

    const events = await loadPsrEstimates(makeQc([winner, loser]))

    // past non-bid 1 PMPE vs 0.5 at SAM time, so 0.5 PMPE on 1000 SOL is 0.5 SOL
    expect(events).toEqual([
      {
        epoch: EPOCH,
        amount: 500_000_000,
        vote_account: 'loser',
        meta: { funder: 'ValidatorBond' },
        reason: {
          ProtectedEvent: {
            CommissionSamIncrease: {
              vote_account: 'loser',
              expected_inflation_commission: 0.5,
              actual_inflation_commission: 0.5,
              past_inflation_commission: 0,
              expected_mev_commission: null,
              actual_mev_commission: null,
              past_mev_commission: null,
              before_sam_commission_increase_pmpe: 0.5,
              expected_epr: 0.001,
              actual_epr: 0.0005,
              epr_loss_bps: 5000,
              stake: 1e12,
            },
          },
        },
      },
    ])
  })

  it('charges a DowntimeRevenueImpact at half the stake-weighted credits mean', async () => {
    const up: Spec = {
      vote: 'up',
      credits: 15_000,
      won: true,
      inflationCommissionDec: 0.5,
    }
    const down: Spec = {
      vote: 'down',
      credits: 5_000,
      won: true,
      inflationCommissionDec: 0.5,
    }
    vi.mocked(fetchScoring).mockResolvedValue([
      scoreRow(up, EPOCH),
      scoreRow(down, EPOCH),
    ])

    const events = await loadPsrEstimates(makeQc([up, down]))

    // expected EPR 0.5/1000, half of it lost on 1000 SOL is 0.25 SOL
    expect(events).toEqual([
      {
        epoch: EPOCH,
        amount: 250_000_000,
        vote_account: 'down',
        meta: { funder: 'ValidatorBond' },
        reason: {
          ProtectedEvent: {
            DowntimeRevenueImpact: {
              vote_account: 'down',
              actual_credits: 5_000,
              expected_credits: 10_000,
              expected_epr: 0.0005,
              actual_epr: 0.00025,
              epr_loss_bps: 5000,
              stake: 1e12,
            },
          },
        },
      },
    ])
  })

  it('never charges a null-commission validator but counts its stake in the credits mean', async () => {
    const up: Spec = {
      vote: 'up',
      credits: 15_000,
      won: true,
      inflationCommissionDec: 0.5,
    }
    const down: Spec = {
      vote: 'down',
      credits: 5_000,
      won: true,
      inflationCommissionDec: 0.5,
    }
    const unknown: Spec = {
      vote: 'unknown',
      credits: 5_000,
      commissionAdvertised: null,
      won: true,
      inflationCommissionDec: 0.5,
    }
    vi.mocked(fetchScoring).mockResolvedValue(
      [up, down, unknown].map(s => scoreRow(s, EPOCH)),
    )

    const events = await loadPsrEstimates(makeQc([up, down, unknown]))

    expect(events.map(e => e.vote_account)).toEqual(['down'])
    const reason = events[0].reason as {
      ProtectedEvent: { DowntimeRevenueImpact: { expected_credits: number } }
    }
    // (15000 + 5000 + 5000) / 3 with equal stakes; 10000 without 'unknown'
    expect(reason.ProtectedEvent.DowntimeRevenueImpact.expected_credits).toBe(
      8333,
    )
  })

  it('keeps the commission estimate in an Alpenglow epoch, where credits are null', async () => {
    const winner: Spec = {
      vote: 'winner',
      credits: null,
      voteReward: 10_000,
      won: true,
      inflationCommissionDec: 0,
    }
    // an equal vote reward keeps the loser clear of an Alpenglow downtime estimate
    const loser: Spec = {
      vote: 'loser',
      credits: null,
      voteReward: 10_000,
      won: false,
      inflationCommissionDec: 0.5,
    }
    vi.mocked(fetchScoring).mockResolvedValue([
      scoreRow(winner, EPOCH),
      scoreRow(loser, EPOCH),
      scoreRow(loser, EPOCH - 1, 0),
    ])

    const events = await loadPsrEstimates(makeQc([winner, loser]))

    expect(events.map(e => [e.vote_account, e.amount])).toEqual([
      ['loser', 500_000_000],
    ])
  })

  it('charges an Alpenglow DowntimeRevenueImpact from vote rewards and leader slots', async () => {
    // validator-bonds alpenglow_collection: w = s/S + L/N expects 1000, 800 and 600 of 2400
    // d holds stake but is outside the reward committee, so it is neither charged nor weighed
    const specs: Spec[] = [
      { vote: 'a', voteReward: 1000, leaderSlots: 3, epochStake: 1e12 },
      { vote: 'b', voteReward: 1000, leaderSlots: 2, epochStake: 1e12 },
      { vote: 'c', voteReward: 400, leaderSlots: 1, epochStake: 1e12 },
      { vote: 'd', voteReward: 0, leaderSlots: 0 },
    ].map(s => ({
      ...s,
      credits: null,
      won: true,
      inflationCommissionDec: 0.5,
    }))
    vi.mocked(fetchScoring).mockResolvedValue(
      specs.map(s => scoreRow(s, EPOCH)),
    )

    const events = await loadPsrEstimates(makeQc(specs))

    // a third of the 0.5/1000 expected EPR lost on 1000 SOL
    expect(events).toEqual([
      {
        epoch: EPOCH,
        amount: 166_666_666,
        vote_account: 'c',
        meta: { funder: 'ValidatorBond' },
        reason: {
          ProtectedEvent: {
            DowntimeRevenueImpact: expect.objectContaining({
              vote_account: 'c',
              actual_credits: 400,
              expected_credits: 600,
              expected_epr: 0.0005,
              epr_loss_bps: 3333,
              stake: 1e12,
            }) as unknown,
          },
        },
      },
    ])
  })

  it('estimates nothing when no validator has epoch stats', async () => {
    vi.mocked(fetchScoring).mockResolvedValue([])
    expect(await loadPsrEstimates(makeQc([]))).toEqual([])
  })
})

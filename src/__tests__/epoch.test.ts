import { describe, it, expect } from 'vitest'

import {
  EPOCH_DURATION_MS,
  epochMeterModel,
  selectCurrentEpochProgress,
  selectLatestAuctionSettled,
  selectLatestPaymentSettled,
  selectNetworkEpoch,
} from '../services/epoch'
import {
  ProtectedEventStatus,
  type ProtectedEventWithValidator,
} from '../services/validator-with-protected_event'

import type { Validator, ValidatorEpoch } from '../services/validators'

const stat = (
  over: Partial<ValidatorEpoch> & { epoch: number },
): ValidatorEpoch => ({
  credits: 0,
  marinade_stake: '0',
  marinade_native_stake: '0',
  activated_stake: '0',
  commission_advertised: 0,
  epoch_start_at: null,
  epoch_end_at: null,
  ...over,
})

const validator = (epochs: number[]): Validator => ({
  vote_account: 'v',
  info_name: null,
  dc_country_iso: null,
  marinade_stake: '0',
  marinade_native_stake: '0',
  activated_stake: '0',
  epoch_stats: epochs.map(epoch => stat({ epoch })),
})

const pe = (
  epoch: number,
  status: ProtectedEventStatus,
): ProtectedEventWithValidator => ({
  status,
  protectedEvent: {
    epoch,
    amount: 0,
    vote_account: 'v',
    meta: { funder: 'ValidatorBond' },
    reason: 'Bidding',
  },
  validator: null,
})

describe('selectNetworkEpoch', () => {
  it('returns the max epoch across all validator stats', () => {
    expect(selectNetworkEpoch([validator([610, 611]), validator([612])])).toBe(
      612,
    )
  })

  it('returns null when no validator has stats', () => {
    expect(selectNetworkEpoch([validator([])])).toBe(null)
    expect(selectNetworkEpoch([])).toBe(null)
  })
})

describe('selectCurrentEpochProgress', () => {
  const start = Date.parse('2026-05-14T00:00:00Z')

  it('returns null when no stats have a start time', () => {
    expect(selectCurrentEpochProgress([validator([612])], start)).toBe(null)
  })

  it('uses the in-progress stat (epoch_end_at === null) with a start time', () => {
    const v: Validator = {
      ...validator([]),
      epoch_stats: [
        stat({
          epoch: 611,
          epoch_start_at: '2026-05-12T00:00:00Z',
          epoch_end_at: '2026-05-14T00:00:00Z',
        }),
        stat({
          epoch: 612,
          epoch_start_at: '2026-05-14T00:00:00Z',
          epoch_end_at: null,
        }),
      ],
    }
    const half = start + EPOCH_DURATION_MS / 2
    const result = selectCurrentEpochProgress([v], half)
    expect(result?.epoch).toBe(612)
    expect(result?.percent).toBeCloseTo(50, 5)
    expect(result?.hoursRemaining).toBeCloseTo(24, 5)
  })

  it('clamps percent at 100 past the 48h mark', () => {
    const v: Validator = {
      ...validator([]),
      epoch_stats: [
        stat({ epoch: 612, epoch_start_at: '2026-05-14T00:00:00Z' }),
      ],
    }
    const over = start + EPOCH_DURATION_MS * 2
    const result = selectCurrentEpochProgress([v], over)
    expect(result?.percent).toBe(100)
    expect(result?.hoursRemaining).toBe(0)
  })
})

describe('selectLatestPaymentSettled', () => {
  it('returns the max past FACT epoch, ignoring ESTIMATE and DRYRUN', () => {
    expect(
      selectLatestPaymentSettled(
        [
          pe(610, ProtectedEventStatus.FACT),
          pe(611, ProtectedEventStatus.ESTIMATE),
          pe(612, ProtectedEventStatus.DRYRUN),
        ],
        972,
      ),
    ).toBe(610)
  })

  it('excludes FACT entries on/after the live epoch', () => {
    expect(
      selectLatestPaymentSettled(
        [
          pe(971, ProtectedEventStatus.FACT),
          pe(972, ProtectedEventStatus.FACT),
        ],
        972,
      ),
    ).toBe(971)
  })

  it('returns null when no FACT event exists', () => {
    expect(
      selectLatestPaymentSettled([pe(612, ProtectedEventStatus.ESTIMATE)], 972),
    ).toBe(null)
    expect(selectLatestPaymentSettled([], 972)).toBe(null)
  })
})

describe('selectLatestAuctionSettled', () => {
  it('returns the max past epoch across any PE status', () => {
    expect(
      selectLatestAuctionSettled(
        [
          pe(610, ProtectedEventStatus.FACT),
          pe(612, ProtectedEventStatus.ESTIMATE),
        ],
        972,
      ),
    ).toBe(612)
  })

  it('excludes the live epoch (auction-for-live-epoch ≠ settled)', () => {
    // Estimator pushes ESTIMATE for in-progress epoch 972; expect 971.
    expect(
      selectLatestAuctionSettled(
        [
          pe(971, ProtectedEventStatus.ESTIMATE),
          pe(972, ProtectedEventStatus.ESTIMATE),
        ],
        972,
      ),
    ).toBe(971)
  })

  it('returns null on empty input', () => {
    expect(selectLatestAuctionSettled([], 972)).toBe(null)
  })
})

describe('epochMeterModel', () => {
  it('all collapse to one live node when payment, auction, live, and target match', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: 612,
      auctionSettled: 612,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.stale).toBe(false)
    expect(m.timeline).toEqual([{ epoch: 612, stages: ['payment', 'live'] }])
  })

  it('payment + auction split: two stages on adjacent epochs', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: 610,
      auctionSettled: 611,
    })
    expect(m.timeline).toEqual([
      { epoch: 610, stages: ['payment'] },
      { epoch: 611, stages: ['auction'] },
      { epoch: 612, stages: ['live'] },
    ])
  })

  it('next-auction node appears when auction target > network', () => {
    const m = epochMeterModel({
      auctionEpoch: 613,
      networkEpoch: 612,
      paymentSettled: 611,
      auctionSettled: 611,
    })
    expect(m.label).toBe('612 → 613')
    expect(m.stale).toBe(false)
    expect(m.timeline).toEqual([
      { epoch: 611, stages: ['payment'] },
      { epoch: 612, stages: ['live'] },
      { epoch: 613, stages: ['next'] },
    ])
  })

  it('stale (auction < network): no next node', () => {
    const m = epochMeterModel({
      auctionEpoch: 610,
      networkEpoch: 612,
      paymentSettled: 610,
      auctionSettled: 611,
    })
    expect(m.label).toBe('612 → 610')
    expect(m.stale).toBe(true)
    expect(m.timeline).toEqual([
      { epoch: 610, stages: ['payment'] },
      { epoch: 611, stages: ['auction'] },
      { epoch: 612, stages: ['live'] },
    ])
  })

  it('null network: no live node, target shown as next when explicit', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: null,
      paymentSettled: null,
      auctionSettled: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.stale).toBe(false)
    expect(m.timeline).toEqual([{ epoch: 612, stages: ['next'] }])
  })

  it('auction-settled coincides with live: merged stages', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: 611,
      auctionSettled: 612,
    })
    expect(m.timeline).toEqual([
      { epoch: 611, stages: ['payment'] },
      { epoch: 612, stages: ['auction', 'live'] },
    ])
  })
})

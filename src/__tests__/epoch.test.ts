// Tests for epoch selectors: selectNetworkEpoch, selectCurrentEpochProgress (48 h clamp),
// selectLatestPaymentSettled, selectLatestAuctionSettled, and epochMeterModel timeline builder.
import { describe, it, expect } from 'vitest'

import {
  EPOCH_DURATION_MS,
  epochMeterModel,
  selectCurrentEpochProgress,
  selectLatestAuctionSettled,
  selectLatestPaymentSettled,
  selectNetworkEpoch,
} from '../services/epoch'
import type {
  ProtectedEventStatus,
  ProtectedEventWithValidator,
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
        [pe(610, 'fact'), pe(611, 'estimate'), pe(612, 'dryrun')],
        972,
      ),
    ).toBe(610)
  })

  it('excludes FACT entries on/after the live epoch', () => {
    expect(
      selectLatestPaymentSettled([pe(971, 'fact'), pe(972, 'fact')], 972),
    ).toBe(971)
  })

  it('returns null when no FACT event exists', () => {
    expect(selectLatestPaymentSettled([pe(612, 'estimate')], 972)).toBe(null)
    expect(selectLatestPaymentSettled([], 972)).toBe(null)
  })
})

describe('selectLatestAuctionSettled', () => {
  it('returns the max past epoch across any PE status', () => {
    expect(
      selectLatestAuctionSettled([pe(610, 'fact'), pe(612, 'estimate')], 972),
    ).toBe(612)
  })

  it('excludes the live epoch (auction-for-live-epoch ≠ settled)', () => {
    // Estimator pushes ESTIMATE for in-progress epoch 972; expect 971.
    expect(
      selectLatestAuctionSettled(
        [pe(971, 'estimate'), pe(972, 'estimate')],
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
    expect(m.critical).toBe(false)
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
    expect(m.critical).toBe(false)
    expect(m.timeline).toEqual([
      { epoch: 611, stages: ['payment'] },
      { epoch: 612, stages: ['live'] },
      { epoch: 613, stages: ['next'] },
    ])
  })

  it('stale by 1 (auction = network - 1): warning but not critical', () => {
    const m = epochMeterModel({
      auctionEpoch: 611,
      networkEpoch: 612,
      paymentSettled: 610,
      auctionSettled: 611,
    })
    expect(m.stale).toBe(true)
    expect(m.critical).toBe(false)
  })

  it('stale by >1 (auction < network - 1): critical', () => {
    const m = epochMeterModel({
      auctionEpoch: 610,
      networkEpoch: 612,
      paymentSettled: 610,
      auctionSettled: 611,
    })
    expect(m.label).toBe('612 → 610')
    expect(m.stale).toBe(true)
    expect(m.critical).toBe(true)
    expect(m.timeline).toEqual([
      { epoch: 610, stages: ['payment'] },
      { epoch: 611, stages: ['auction'] },
      { epoch: 612, stages: ['live'] },
    ])
  })

  it('null network → auction epoch shown as live (fallback)', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: null,
      paymentSettled: null,
      auctionSettled: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.stale).toBe(false)
    expect(m.critical).toBe(false)
    expect(m.timeline).toEqual([{ epoch: 612, stages: ['live'] }])
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

  it('null paymentSettled → no payment node in timeline', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: null,
      auctionSettled: 611,
    })
    const epochs = m.timeline.map(n => n.epoch)
    expect(epochs).not.toContain(null)
    expect(m.timeline.find(n => n.stages.includes('payment'))).toBeUndefined()
  })

  it('null auctionSettled → no auction-only node', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: 611,
      auctionSettled: null,
    })
    expect(m.timeline.find(n => n.stages.includes('auction'))).toBeUndefined()
  })

  it('payment and auction both null + networkEpoch → single live node', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      paymentSettled: null,
      auctionSettled: null,
    })
    expect(m.timeline).toEqual([{ epoch: 612, stages: ['live'] }])
  })
})

describe('selectNetworkEpoch — edge cases', () => {
  it('single validator, single stat → returns that epoch', () => {
    expect(selectNetworkEpoch([validator([700])])).toBe(700)
  })

  it('multiple validators with overlapping epochs → max wins', () => {
    expect(
      selectNetworkEpoch([
        validator([700, 701]),
        validator([701, 702]),
        validator([699]),
      ]),
    ).toBe(702)
  })
})

describe('selectCurrentEpochProgress — edge cases', () => {
  const start = Date.parse('2026-05-14T00:00:00Z')

  it('multiple in-progress stats (epoch_end_at null) → uses the highest epoch', () => {
    const v: Validator = {
      ...validator([]),
      epoch_stats: [
        stat({
          epoch: 611,
          epoch_start_at: '2026-05-12T00:00:00Z',
          epoch_end_at: null, // incorrectly open — lower epoch
        }),
        stat({
          epoch: 612,
          epoch_start_at: '2026-05-14T00:00:00Z',
          epoch_end_at: null,
        }),
      ],
    }
    const result = selectCurrentEpochProgress([v], start)
    expect(result?.epoch).toBe(612)
  })

  it('stat with epoch_start_at null → skipped', () => {
    const v: Validator = {
      ...validator([]),
      epoch_stats: [
        stat({ epoch: 612, epoch_start_at: null, epoch_end_at: null }),
      ],
    }
    expect(selectCurrentEpochProgress([v], start)).toBeNull()
  })
})

describe('selectLatestPaymentSettled — edge cases', () => {
  it('networkEpoch null → no epoch excluded', () => {
    // When networkEpoch is null the guard is skipped; any past FACT is included.
    expect(selectLatestPaymentSettled([pe(972, 'fact')], null)).toBe(972)
  })
})

describe('selectLatestAuctionSettled — edge cases', () => {
  it('networkEpoch null → no epoch excluded', () => {
    expect(selectLatestAuctionSettled([pe(972, 'estimate')], null)).toBe(972)
  })

  it('all events on or after live epoch excluded → null', () => {
    expect(
      selectLatestAuctionSettled(
        [pe(972, 'estimate'), pe(973, 'estimate')],
        972,
      ),
    ).toBeNull()
  })
})

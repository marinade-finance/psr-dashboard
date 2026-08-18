// Tests for epoch selectors: selectNetworkEpoch, selectLatestPaymentSettled,
// selectLatestAuctionSettled, and epochMeterModel timeline builder.
import { describe, it, expect } from 'vitest'

import {
  epochInfoProgress,
  epochMeterModel,
  selectLatestAuctionSettled,
  selectLatestPaymentSettled,
  selectNetworkEpoch,
  slotDurationFromSamples,
} from '../services/epoch'
import type { PerformanceSample } from '../services/epoch'
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

describe('epochInfoProgress', () => {
  const SLOTS = 432_000
  const AT_400MS = 0.4
  const AT_200MS = 0.2

  it('mid-epoch → 50% with half the slots of remaining time', () => {
    const r = epochInfoProgress(
      { epoch: 612, slotIndex: SLOTS / 2, slotsInEpoch: SLOTS },
      AT_400MS,
    )
    expect(r.epoch).toBe(612)
    expect(r.percent).toBeCloseTo(50, 5)
    expect(r.hoursRemaining).toBeCloseTo(24, 5)
  })

  it('start of epoch → 0% and a full epoch of remaining time', () => {
    const r = epochInfoProgress(
      { epoch: 612, slotIndex: 0, slotsInEpoch: SLOTS },
      AT_400MS,
    )
    expect(r.percent).toBe(0)
    expect(r.hoursRemaining).toBeCloseTo(48, 5)
  })

  // The SIMD-0525 regression guard: halving the slot time must halve the
  // countdown, never leave it pinned at the old 48h nominal.
  it('halved slot time halves the countdown at identical slot counts', () => {
    const info = { epoch: 612, slotIndex: 0, slotsInEpoch: SLOTS }
    expect(epochInfoProgress(info, AT_200MS).hoursRemaining).toBeCloseTo(24, 5)
    expect(epochInfoProgress(info, AT_200MS).percent).toBe(
      epochInfoProgress(info, AT_400MS).percent,
    )
  })

  it('measured rate slower than nominal extends the countdown', () => {
    const info = { epoch: 612, slotIndex: 0, slotsInEpoch: SLOTS }
    // 0.4161 s/slot — mainnet's actual observed rate, ~4% off the 0.4 nominal.
    expect(epochInfoProgress(info, 0.4161).hoursRemaining).toBeCloseTo(49.93, 2)
    expect(epochInfoProgress(info, AT_400MS).hoursRemaining).toBeCloseTo(48, 5)
  })

  it('unavailable slot rate → percent still exact, countdown dropped', () => {
    const r = epochInfoProgress(
      { epoch: 612, slotIndex: SLOTS / 4, slotsInEpoch: SLOTS },
      null,
    )
    expect(r.percent).toBeCloseTo(25, 5)
    expect(r.hoursRemaining).toBeNull()
  })

  it('at the last slot → clamps to 100% / 0h', () => {
    const r = epochInfoProgress(
      { epoch: 612, slotIndex: SLOTS, slotsInEpoch: SLOTS },
      AT_400MS,
    )
    expect(r.percent).toBe(100)
    expect(r.hoursRemaining).toBe(0)
  })

  it('slotIndex past slotsInEpoch → still clamps to 100% / 0h', () => {
    const r = epochInfoProgress(
      { epoch: 612, slotIndex: SLOTS + 50_000, slotsInEpoch: SLOTS },
      AT_400MS,
    )
    expect(r.percent).toBe(100)
    expect(r.hoursRemaining).toBe(0)
  })
})

describe('slotDurationFromSamples', () => {
  it('pools slots over pooled seconds, not a mean of ratios', () => {
    // 721 slots over 300s — the shape getRecentPerformanceSamples returns.
    expect(
      slotDurationFromSamples([
        { numSlots: 145, samplePeriodSecs: 60 },
        { numSlots: 145, samplePeriodSecs: 60 },
        { numSlots: 142, samplePeriodSecs: 60 },
        { numSlots: 145, samplePeriodSecs: 60 },
        { numSlots: 144, samplePeriodSecs: 60 },
      ]),
    ).toBeCloseTo(300 / 721, 9)
  })

  it('weights a long window over a short one', () => {
    // Ratio-averaging would give 0.75; slot-weighting gives 110/200 = 0.55.
    expect(
      slotDurationFromSamples([
        { numSlots: 190, samplePeriodSecs: 100 },
        { numSlots: 10, samplePeriodSecs: 10 },
      ]),
    ).toBeCloseTo(0.55, 9)
  })

  it('skips zero-slot windows rather than dividing by zero', () => {
    expect(
      slotDurationFromSamples([
        { numSlots: 0, samplePeriodSecs: 60 },
        { numSlots: 150, samplePeriodSecs: 60 },
      ]),
    ).toBeCloseTo(0.4, 9)
  })

  it('returns null when no window is usable', () => {
    expect(slotDurationFromSamples([])).toBeNull()
    expect(
      slotDurationFromSamples([{ numSlots: 0, samplePeriodSecs: 0 }]),
    ).toBeNull()
  })

  it('skips malformed samples from an unexpected RPC payload', () => {
    const samples = [
      { numSlots: 'lots', samplePeriodSecs: 60 },
      { numSlots: 150, samplePeriodSecs: 60 },
    ] as unknown as PerformanceSample[]
    expect(slotDurationFromSamples(samples)).toBeCloseTo(0.4, 9)
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

  it('networkEpoch null → no epoch excluded', () => {
    // When networkEpoch is null the guard is skipped; any past FACT is included.
    expect(selectLatestPaymentSettled([pe(972, 'fact')], null)).toBe(972)
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

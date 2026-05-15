import { describe, it, expect } from 'vitest'

import {
  EPOCH_DURATION_MS,
  epochMeterModel,
  selectCurrentEpochProgress,
  selectLatestSettlement,
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

describe('selectLatestSettlement', () => {
  it('picks the highest-epoch event and maps FACT to on-chain', () => {
    expect(
      selectLatestSettlement([
        pe(610, ProtectedEventStatus.FACT),
        pe(611, ProtectedEventStatus.FACT),
      ]),
    ).toEqual({ epoch: 611, onChain: true })
  })

  it('maps ESTIMATE and DRYRUN to not-on-chain', () => {
    expect(
      selectLatestSettlement([pe(612, ProtectedEventStatus.ESTIMATE)]),
    ).toEqual({ epoch: 612, onChain: false })
    expect(
      selectLatestSettlement([pe(607, ProtectedEventStatus.DRYRUN)]),
    ).toEqual({ epoch: 607, onChain: false })
  })

  it('returns null on empty input', () => {
    expect(selectLatestSettlement([])).toBe(null)
  })
})

describe('epochMeterModel', () => {
  it('equal epochs: single number, no arrow, not stale, timeline with live=target', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.arrow).toBe(false)
    expect(m.stale).toBe(false)
    expect(m.timeline).toEqual({ settled: null, live: 612, target: 612 })
  })

  it('auction = network + 1: arrow, future target, not stale', () => {
    const m = epochMeterModel({
      auctionEpoch: 613,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.label).toBe('612 → 613')
    expect(m.arrow).toBe(true)
    expect(m.stale).toBe(false)
    expect(m.timeline.target).toBe(613)
    expect(m.timeline.live).toBe(612)
  })

  it('stale (auction < network): warning flag set', () => {
    const m = epochMeterModel({
      auctionEpoch: 610,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.stale).toBe(true)
    expect(m.timeline).toEqual({ settled: null, live: 612, target: 610 })
  })

  it('null network epoch: live missing, no arrow', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: null,
      settlement: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.arrow).toBe(false)
    expect(m.stale).toBe(false)
    expect(m.timeline).toEqual({ settled: null, live: null, target: 612 })
  })

  it('settlement populates timeline.settled', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      settlement: { epoch: 611, onChain: true },
    })
    expect(m.timeline.settled).toBe(611)
  })
})

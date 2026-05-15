import { describe, it, expect } from 'vitest'

import {
  epochMeterModel,
  selectLatestSettlement,
  selectNetworkEpoch,
} from '../services/epoch'
import {
  ProtectedEventStatus,
  type ProtectedEventWithValidator,
} from '../services/validator-with-protected_event'

import type { Validator } from '../services/validators'

const validator = (epochs: number[]): Validator => ({
  vote_account: 'v',
  info_name: null,
  dc_country_iso: null,
  marinade_stake: '0',
  marinade_native_stake: '0',
  activated_stake: '0',
  epoch_stats: epochs.map(epoch => ({
    epoch,
    credits: 0,
    marinade_stake: '0',
    marinade_native_stake: '0',
    activated_stake: '0',
    commission_advertised: 0,
    epoch_start_at: null,
    epoch_end_at: null,
  })),
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
  it('equal epochs: single number, no arrow, not stale, live copy', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.arrow).toBe(false)
    expect(m.stale).toBe(false)
    expect(m.lines).toEqual([
      'Auction allocates stake for epoch 612.',
      'Solana is in epoch 612 now — this is the live allocation.',
    ])
  })

  it('auction = network + 1: arrow, next-epoch copy, not stale', () => {
    const m = epochMeterModel({
      auctionEpoch: 613,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.label).toBe('612 → 613')
    expect(m.arrow).toBe(true)
    expect(m.stale).toBe(false)
    expect(m.lines[1]).toBe(
      "Solana is in epoch 612 now — this is next epoch's allocation.",
    )
  })

  it('stale (auction < network): warning, behind-the-chain copy', () => {
    const m = epochMeterModel({
      auctionEpoch: 610,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.label).toBe('612 → 610')
    expect(m.arrow).toBe(true)
    expect(m.stale).toBe(true)
    expect(m.lines[1]).toBe(
      'Solana is in epoch 612 now — the view is 2 epochs behind the chain.',
    )
  })

  it('one epoch behind uses singular "epoch"', () => {
    const m = epochMeterModel({
      auctionEpoch: 611,
      networkEpoch: 612,
      settlement: null,
    })
    expect(m.lines[1]).toBe(
      'Solana is in epoch 612 now — the view is 1 epoch behind the chain.',
    )
  })

  it('null network epoch: line 2 omitted, no arrow, single number', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: null,
      settlement: null,
    })
    expect(m.label).toBe('Epoch 612')
    expect(m.arrow).toBe(false)
    expect(m.stale).toBe(false)
    expect(m.lines).toEqual(['Auction allocates stake for epoch 612.'])
  })

  it('FACT settlement: on-chain wording', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      settlement: { epoch: 611, onChain: true },
    })
    expect(m.lines[2]).toBe('Epoch 611 settlements: on-chain.')
  })

  it('ESTIMATE settlement: not-yet-on-chain wording', () => {
    const m = epochMeterModel({
      auctionEpoch: 612,
      networkEpoch: 612,
      settlement: { epoch: 612, onChain: false },
    })
    expect(m.lines[2]).toBe(
      'Epoch 612 settlements: estimated, not yet on-chain.',
    )
  })
})

// fetchValidatorsWithBonds: zero-stake validator with a bond must be retained;
// zero-stake validator without a bond must be dropped.
import { describe, expect, it, vi } from 'vitest'

import { fetchValidatorsWithBonds } from '../validator-with-bond'

import type { BondRecord } from '../bonds'
import type { Validator } from '../validators'
import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { QueryClient } from '@tanstack/react-query'

function makeValidator(
  vote_account: string,
  marinade_stake = '0',
  marinade_native_stake = '0',
): Validator {
  return {
    vote_account,
    info_name: null,
    dc_country_iso: null,
    marinade_stake,
    marinade_native_stake,
    activated_stake: '0',
    epoch_stats: [],
  }
}

function makeBond(vote_account: string): BondRecord {
  return {
    pubkey: 'pk',
    vote_account,
    authority: 'auth',
    cpmpe: '0',
    updated_at: '2024-01-01',
    epoch: 700,
    funded_amount: 1_000_000_000,
    effective_amount: 1_000_000_000,
    max_stake_wanted: 0,
    remaining_witdraw_request_amount: 0,
    remainining_settlement_claim_amount: 0,
  }
}

const emptyAuctionResult = {
  auctionData: { validators: [] },
} as unknown as AuctionResult

vi.mock('../bonds', () => ({
  fetchBonds: vi.fn(),
}))
vi.mock('../validators', () => ({
  fetchValidatorsWithEpochs: vi.fn(),
}))
vi.mock('../sam', () => ({
  loadSam: vi.fn(),
}))

import { fetchBonds } from '../bonds'
import { fetchValidatorsWithEpochs } from '../validators'
import { loadSam } from '../sam'

const mockQc = {
  ensureQueryData: () => Promise.resolve({ auctionResult: emptyAuctionResult }),
} as unknown as QueryClient

describe('fetchValidatorsWithBonds', () => {
  it('retains zero-stake validator that has a bond', async () => {
    vi.mocked(fetchValidatorsWithEpochs).mockResolvedValue({
      validators: [makeValidator('va1', '0', '0')],
    })
    vi.mocked(fetchBonds).mockResolvedValue({
      bonds: [makeBond('va1')],
    })
    vi.mocked(loadSam).mockResolvedValue({
      auctionResult: emptyAuctionResult,
    } as never)

    const result = await fetchValidatorsWithBonds(mockQc)
    expect(result.map(r => r.validator.vote_account)).toContain('va1')
    expect(
      result.find(r => r.validator.vote_account === 'va1')?.bond,
    ).not.toBeNull()
  })

  it('drops zero-stake validator with no bond', async () => {
    vi.mocked(fetchValidatorsWithEpochs).mockResolvedValue({
      validators: [makeValidator('va2', '0', '0')],
    })
    vi.mocked(fetchBonds).mockResolvedValue({ bonds: [] })

    const result = await fetchValidatorsWithBonds(mockQc)
    expect(result.map(r => r.validator.vote_account)).not.toContain('va2')
  })

  it('retains validator with marinade stake and no bond', async () => {
    vi.mocked(fetchValidatorsWithEpochs).mockResolvedValue({
      validators: [makeValidator('va3', '1000000000', '0')],
    })
    vi.mocked(fetchBonds).mockResolvedValue({ bonds: [] })

    const result = await fetchValidatorsWithBonds(mockQc)
    expect(result.map(r => r.validator.vote_account)).toContain('va3')
  })
})

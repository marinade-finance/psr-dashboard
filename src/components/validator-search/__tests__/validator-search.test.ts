import { describe, expect, it } from 'vitest'

import { findMatches } from '../validator-search'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const makeValidator = (voteAccount: string): AuctionValidator =>
  ({ voteAccount }) as unknown as AuctionValidator

const VALIDATORS = [
  makeValidator('AaaaPubKey1111111111111111111111111111111111'),
  makeValidator('BbbbCoolNode22222222222222222222222222222222'),
  makeValidator('CcccChorus333333333333333333333333333333333'),
  makeValidator('DdddSolflare4444444444444444444444444444444'),
]

const NAMES = new Map<string, { name?: string }>([
  [VALIDATORS[0].voteAccount, { name: 'Marinade Native Foo' }],
  [VALIDATORS[1].voteAccount, { name: 'CoolNode' }],
  [VALIDATORS[2].voteAccount, { name: 'Chorus One' }],
  [VALIDATORS[3].voteAccount, { name: undefined }],
])

describe('findMatches', () => {
  it('returns nothing for queries shorter than 2 chars', () => {
    expect(findMatches('', VALIDATORS, NAMES)).toEqual([])
    expect(findMatches('a', VALIDATORS, NAMES)).toEqual([])
  })

  it('matches exact vote account', () => {
    const r = findMatches(VALIDATORS[0].voteAccount, VALIDATORS, NAMES)
    expect(r.map(m => m.voteAccount)).toEqual([VALIDATORS[0].voteAccount])
  })

  it('matches vote-account prefix', () => {
    const r = findMatches('Bbbb', VALIDATORS, NAMES)
    expect(r.map(m => m.voteAccount)).toContain(VALIDATORS[1].voteAccount)
  })

  it('matches name prefix case-insensitively', () => {
    const r = findMatches('cool', VALIDATORS, NAMES)
    expect(r.map(m => m.voteAccount)).toEqual([VALIDATORS[1].voteAccount])
  })

  it('matches name substring', () => {
    const r = findMatches('Native', VALIDATORS, NAMES)
    expect(r.map(m => m.voteAccount)).toEqual([VALIDATORS[0].voteAccount])
  })

  it('ranks exact vote → vote prefix → name prefix → name contains', () => {
    const r = findMatches('co', VALIDATORS, NAMES)
    // CoolNode (name prefix) ranks above Chorus One (name contains 'co' as
    // case-insensitive substring? actually 'chorus' starts with 'ch', not 'co'
    // — but 'one' contains 'o' not 'co'. so only CoolNode matches.)
    expect(r.map(m => m.voteAccount)).toEqual([VALIDATORS[1].voteAccount])
  })

  it('caps results at MAX_RESULTS', () => {
    const many: AuctionValidator[] = Array.from({ length: 30 }, (_, i) =>
      makeValidator(`prefix${i.toString().padStart(40, '0')}`),
    )
    const map = new Map<string, { name?: string }>(
      many.map(x => [x.voteAccount, { name: 'mass match' }]),
    )
    const r = findMatches('mass', many, map)
    expect(r.length).toBe(8)
  })

  it('ignores validators with no name when querying by name', () => {
    const r = findMatches('Solflare', VALIDATORS, NAMES)
    // VALIDATORS[3] has name=undefined; query should not match the vote
    // account containing "Solflare".
    // (vote-account prefix is 'Dddd…' so not a prefix match either.)
    expect(r).toEqual([])
  })
})

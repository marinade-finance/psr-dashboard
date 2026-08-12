// Tests for selectConcentration: the ASO / country split of SAM target stake
// that feeds the Concentration page donuts + tables.
import { describe, it, expect } from 'vitest'

import { selectConcentration } from '../concentration'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Deliberately different per dimension — they really do differ in production
// (ASO 30%, country 40%), so an equal pair would hide a swapped lookup.
const cfg = {
  maxNetworkStakeConcentrationPerAsoDec: 0.3,
  maxNetworkStakeConcentrationPerCountryDec: 0.4,
} as unknown as DsSamConfig

const makeValidator = (
  voteAccount: string,
  target: number,
  aso: string | null,
  country: string | null = 'DE',
): AuctionValidator =>
  ({
    voteAccount,
    auctionStake: { marinadeSamTargetSol: target },
    aso,
    country,
  }) as unknown as AuctionValidator

const makeResult = (validators: AuctionValidator[]): AuctionResult =>
  ({ auctionData: { validators } }) as unknown as AuctionResult

describe('selectConcentration — grouping', () => {
  // aws 300, ovh 200 → total 500.
  const result = makeResult([
    makeValidator('A', 200, 'aws'),
    makeValidator('B', 100, 'aws'),
    makeValidator('C', 200, 'ovh'),
  ])

  it('sums SAM target stake per group', () => {
    const { rows } = selectConcentration(result, cfg, 'aso')
    expect(rows.map(r => [r.group, r.sol])).toEqual([
      ['aws', 300],
      ['ovh', 200],
    ])
  })

  it('shares are fractions of total SAM target stake', () => {
    const { rows, totalSol } = selectConcentration(result, cfg, 'aso')
    expect(totalSol).toBe(500)
    expect(rows[0].pctOfTotal).toBeCloseTo(0.6)
    expect(rows[1].pctOfTotal).toBeCloseTo(0.4)
  })

  it('counts the validators contributing to each group', () => {
    const { rows } = selectConcentration(result, cfg, 'aso')
    expect(rows[0].validatorCount).toBe(2)
    expect(rows[1].validatorCount).toBe(1)
  })

  it('reports how many groups hold SAM stake', () => {
    expect(selectConcentration(result, cfg, 'aso').groupCount).toBe(2)
  })
})

describe('selectConcentration — dimensions', () => {
  const result = makeResult([
    makeValidator('A', 300, 'aws', 'Germany'),
    makeValidator('B', 100, 'ovh', 'Germany'),
    makeValidator('C', 100, 'aws', 'Japan'),
  ])

  it('groups by ASO when asked for aso', () => {
    const { rows, dimension } = selectConcentration(result, cfg, 'aso')
    expect(dimension).toBe('aso')
    expect(rows.map(r => [r.group, r.sol])).toEqual([
      ['aws', 400],
      ['ovh', 100],
    ])
  })

  it('groups by country when asked for country', () => {
    const { rows, dimension } = selectConcentration(result, cfg, 'country')
    expect(dimension).toBe('country')
    expect(rows.map(r => [r.group, r.sol])).toEqual([
      ['Germany', 400],
      ['Japan', 100],
    ])
  })

  it('carries each dimension its OWN cap, not the other one', () => {
    expect(selectConcentration(result, cfg, 'aso').capPct).toBe(0.3)
    expect(selectConcentration(result, cfg, 'country').capPct).toBe(0.4)
  })

  it('totals match across dimensions — the same stake, split two ways', () => {
    const aso = selectConcentration(result, cfg, 'aso')
    const country = selectConcentration(result, cfg, 'country')
    expect(aso.totalSol).toBe(country.totalSol)
  })
})

describe('selectConcentration — what counts', () => {
  it('excludes zero-target validators from the group and the total', () => {
    // Out-of-set validators carry marinadeSamTargetSol 0. Counting them
    // would inflate a group's validator count with validators holding no
    // Marinade stake, and 'ghost' would appear as a 0% slice.
    const result = makeResult([
      makeValidator('A', 100, 'aws'),
      makeValidator('OUT', 0, 'aws'),
      makeValidator('GHOST', 0, 'ghost'),
    ])
    const { rows, totalSol, groupCount } = selectConcentration(
      result,
      cfg,
      'aso',
    )
    expect(totalSol).toBe(100)
    expect(groupCount).toBe(1)
    expect(rows[0].validatorCount).toBe(1)
  })

  it('groups a missing ASO under Unknown rather than dropping the stake', () => {
    // Dropping it would make the shares sum to less than 100% with no
    // visible reason — the donut must always account for the whole total.
    const result = makeResult([
      makeValidator('A', 300, 'aws'),
      makeValidator('B', 100, null),
    ])
    const { rows, totalSol } = selectConcentration(result, cfg, 'aso')
    expect(totalSol).toBe(400)
    expect(rows.map(r => r.group)).toEqual(['aws', 'Unknown'])
  })

  it('groups a missing country under Unknown too', () => {
    const result = makeResult([
      makeValidator('A', 300, 'aws', 'Germany'),
      makeValidator('B', 100, 'ovh', null),
    ])
    const { rows } = selectConcentration(result, cfg, 'country')
    expect(rows.map(r => r.group)).toEqual(['Germany', 'Unknown'])
  })

  it('returns an empty split for an auction with no SAM stake', () => {
    const empty = selectConcentration(makeResult([]), cfg, 'aso')
    expect(empty.rows).toEqual([])
    expect(empty.slices).toEqual([])
    expect(empty.totalSol).toBe(0)
    expect(empty.groupCount).toBe(0)
  })
})

describe('selectConcentration — ordering', () => {
  it('ranks groups by stake, descending', () => {
    const result = makeResult([
      makeValidator('A', 100, 'small'),
      makeValidator('B', 300, 'big'),
      makeValidator('C', 200, 'mid'),
    ])
    const { rows } = selectConcentration(result, cfg, 'aso')
    expect(rows.map(r => r.group)).toEqual(['big', 'mid', 'small'])
  })

  it('breaks ties by name so the order is stable across refetches', () => {
    const result = makeResult([
      makeValidator('A', 100, 'zeta'),
      makeValidator('B', 100, 'alpha'),
    ])
    const { rows } = selectConcentration(result, cfg, 'aso')
    expect(rows.map(r => r.group)).toEqual(['alpha', 'zeta'])
  })
})

describe('selectConcentration — the Other fold', () => {
  const many = makeResult([
    makeValidator('A', 500, 'a'),
    makeValidator('B', 300, 'b'),
    makeValidator('C', 100, 'c'),
    makeValidator('D', 60, 'd'),
    makeValidator('E', 30, 'e'),
    makeValidator('F', 8, 'f'),
    makeValidator('G', 2, 'g'),
  ])

  it('keeps the top N groups and folds the rest into one Other slice', () => {
    const { slices } = selectConcentration(many, cfg, 'aso', 5)
    expect(slices.map(s => s.group)).toEqual(['a', 'b', 'c', 'd', 'e', 'Other'])
  })

  it('Other carries the summed stake, share and validator count', () => {
    const { slices } = selectConcentration(many, cfg, 'aso', 5)
    const other = slices[slices.length - 1]
    expect(other.isOther).toBe(true)
    expect(other.sol).toBe(10)
    expect(other.pctOfTotal).toBeCloseTo(10 / 1000)
    expect(other.validatorCount).toBe(2)
    expect(other.groupCount).toBe(2)
  })

  it('slice shares always sum to 1', () => {
    const { slices } = selectConcentration(many, cfg, 'aso', 5)
    const sum = slices.reduce((acc, s) => acc + s.pctOfTotal, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('adds no Other slice when the groups already fit', () => {
    const result = makeResult([
      makeValidator('A', 100, 'a'),
      makeValidator('B', 100, 'b'),
    ])
    const { slices } = selectConcentration(result, cfg, 'aso', 5)
    expect(slices.map(s => s.group)).toEqual(['a', 'b'])
    expect(slices.some(s => s.isOther)).toBe(false)
  })

  it('folds nothing when exactly topN + 0 groups exist', () => {
    // Guards the off-by-one: a lone trailing group must render as itself,
    // never as an "Other" of one.
    const result = makeResult([
      makeValidator('A', 500, 'a'),
      makeValidator('B', 300, 'b'),
      makeValidator('C', 100, 'c'),
    ])
    const { slices } = selectConcentration(result, cfg, 'aso', 3)
    expect(slices.map(s => s.group)).toEqual(['a', 'b', 'c'])
  })

  it('rows keep every group unfolded even when slices fold', () => {
    const { rows, slices } = selectConcentration(many, cfg, 'aso', 5)
    expect(rows).toHaveLength(7)
    expect(rows.some(r => r.isOther)).toBe(false)
    expect(slices).toHaveLength(6)
  })
})

import { describe, it, expect } from 'vitest'

import {
  formatSolAmount,
  formatPercentage,
  pay,
  payCta,
  pmpe,
  stake,
  stakeCta,
} from '../format'

describe('formatSolAmount', () => {
  it('keeps two decimals for sub-unit amounts', () => {
    expect(formatSolAmount(0.17, 2)).toBe('0.17')
  })

  it('rounds to integer without trailing decimals', () => {
    expect(formatSolAmount(0.17, 0)).toBe('0')
  })

  it('uses locale separators and rounds half away from zero', () => {
    expect(formatSolAmount(1234.567, 2)).toBe('1,234.57')
  })

  it('rounds negative half away from zero (toLocaleString behavior)', () => {
    expect(formatSolAmount(-0.5, 0)).toBe('-1')
  })
})

describe('pay / stake', () => {
  it('pay formats with two decimals and SOL suffix', () => {
    expect(pay(0.17)).toBe('0.17 SOL')
  })

  it('stake formats integer-only with SOL suffix', () => {
    expect(stake(0.4)).toBe('0 SOL')
  })
})

describe('pmpe', () => {
  it('renders 5 decimal digits', () => {
    expect(pmpe(0.123456789)).toBe('0.12346')
  })
})

// Regression: top-up CTAs that round to "0 SOL" / "0.00 SOL" — the bug was
// "Top up 0 SOL to win more" / "Top up 0.00 SOL to avoid fee". CTAs should
// floor sub-display values to "<1" or "<0.01" so they stay actionable.
describe('payCta', () => {
  it('positive sub-cent value displays as "<0.01 SOL", not "0.00 SOL"', () => {
    expect(payCta(0.003)).toBe('<0.01 SOL')
  })

  it('zero stays "0.00 SOL" (no false CTA)', () => {
    expect(payCta(0)).toBe('0.00 SOL')
  })

  it('values >= 0.005 round normally', () => {
    expect(payCta(0.5)).toBe('0.50 SOL')
  })
})

describe('stakeCta', () => {
  it('positive sub-1 value displays as "<1 SOL", not "0 SOL"', () => {
    expect(stakeCta(0.4)).toBe('<1 SOL')
  })

  it('zero stays "0 SOL"', () => {
    expect(stakeCta(0)).toBe('0 SOL')
  })

  it('values >= 0.5 round normally', () => {
    expect(stakeCta(0.5)).toBe('1 SOL')
    expect(stakeCta(42)).toBe('42 SOL')
  })
})

describe('formatPercentage', () => {
  it('renders two decimals with percent suffix', () => {
    expect(formatPercentage(0.0517, 2)).toBe('5.17%')
  })

  it('renders integer percent', () => {
    expect(formatPercentage(0.0517, 0)).toBe('5%')
  })
})

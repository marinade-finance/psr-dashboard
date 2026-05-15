import { describe, it, expect } from 'vitest'

import { sol, pct, pay, pmpe, stake, topUp } from '../format'

describe('sol', () => {
  it('keeps two decimals for sub-unit amounts', () => {
    expect(sol(0.17, 2)).toBe('0.17')
  })

  it('rounds to integer without trailing decimals', () => {
    expect(sol(0.17, 0)).toBe('0')
  })

  it('uses locale separators and rounds half away from zero', () => {
    expect(sol(1234.567, 2)).toBe('1,234.57')
  })

  it('rounds negative half away from zero (toLocaleString behavior)', () => {
    expect(sol(-0.5, 0)).toBe('-1')
  })
})

describe('pay / stake', () => {
  it('pay formats whole-SOL with SOL suffix', () => {
    expect(pay(0.17)).toBe('0 SOL')
    expect(pay(1.7)).toBe('2 SOL')
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

// Top-up advice ALWAYS rounds UP (ceil) and never shows "0 SOL" or
// "<1 SOL": advising a rounded-down top-up leaves the bond short.
describe('topUp', () => {
  it('any positive value yields at least "1 SOL" (never "0" / "<1")', () => {
    expect(topUp(0.0001)).toBe('1 SOL')
    expect(topUp(0.4)).toBe('1 SOL')
  })

  it('rounds up to the next whole SOL (ceil), never down', () => {
    expect(topUp(1.2)).toBe('2 SOL')
    expect(topUp(0.5)).toBe('1 SOL')
  })

  it('whole values are unchanged', () => {
    expect(topUp(3)).toBe('3 SOL')
    expect(topUp(42)).toBe('42 SOL')
  })
})

describe('pct', () => {
  it('renders two decimals with percent suffix', () => {
    expect(pct(0.0517, 2)).toBe('5.17%')
  })

  it('renders integer percent', () => {
    expect(pct(0.0517, 0)).toBe('5%')
  })
})

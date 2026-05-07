import { describe, it, expect } from 'vitest'

import { formatSolAmount, formatPercentage, pay, stake, pmpe } from '../format'

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

describe('formatPercentage', () => {
  it('renders two decimals with percent suffix', () => {
    expect(formatPercentage(0.0517, 2)).toBe('5.17%')
  })

  it('renders integer percent', () => {
    expect(formatPercentage(0.0517, 0)).toBe('5%')
  })
})

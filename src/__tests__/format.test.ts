// Tests for number-formatting helpers: sol, pay, stake, pmpe, topUp, pct — decimal places,
// rounding direction, and edge values.
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
  // NBSP ( ) between number and unit so "1,234 SOL" never wraps across
  // a line break — see comment in format.ts.
  it('pay formats whole-SOL with NBSP + SOL suffix (ceiling)', () => {
    expect(pay(0.17)).toBe('1 SOL')
    expect(pay(1.4)).toBe('2 SOL')
    expect(pay(1.7)).toBe('2 SOL')
  })

  it('stake formats integer-only with NBSP + SOL suffix', () => {
    expect(stake(0.4)).toBe('0 SOL')
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

  it('value >= maxValue → ">N%" sentinel string', () => {
    expect(pct(1.0, 2, 0.5)).toBe('>50.00%')
  })

  it('value <= -maxValue → "<-N%" sentinel string', () => {
    expect(pct(-1.0, 2, 0.5)).toBe('<-50.00%')
  })
})

import {
  finite,
  bondSol,
  penalty,
  cost,
  signedStake,
  lamportsToSol,
} from '../format'

describe('finite', () => {
  it('finite number → passes through unchanged', () => {
    expect(finite(3.14)).toBe(3.14)
    expect(finite(0)).toBe(0)
    expect(finite(-7)).toBe(-7)
  })

  it('NaN → 0', () => {
    expect(finite(NaN)).toBe(0)
  })

  it('Infinity → 0', () => {
    expect(finite(Infinity)).toBe(0)
    expect(finite(-Infinity)).toBe(0)
  })

  it('null → 0', () => {
    expect(finite(null)).toBe(0)
  })

  it('undefined → 0', () => {
    expect(finite(undefined as unknown as number)).toBe(0)
  })
})

describe('bondSol', () => {
  it('rounds DOWN to 1 decimal place (never overstates available bond)', () => {
    // 10.19 → floor(10.19 * 10) / 10 = 10.1
    expect(bondSol(10.19)).toBe('10.1 SOL')
  })

  it('whole number → one trailing decimal zero', () => {
    expect(bondSol(5)).toBe('5.0 SOL')
  })

  it('zero → "0.0 SOL"', () => {
    expect(bondSol(0)).toBe('0.0 SOL')
  })
})

// NBSP ( ) is used between number and "SOL" in penalty/cost/signedStake/stake/pay
const NBSP = ' '

describe('penalty', () => {
  it('formats to 3 decimal places with NBSP + SOL suffix', () => {
    expect(penalty(1.23456)).toBe(`1.235${NBSP}SOL`)
  })

  it('zero → "0.000 NBSP SOL"', () => {
    expect(penalty(0)).toBe(`0.000${NBSP}SOL`)
  })
})

describe('cost', () => {
  it('formats to 3 decimal places with NBSP + SOL suffix', () => {
    expect(cost(12.3456)).toBe(`12.346${NBSP}SOL`)
  })

  it('zero → "0.000 NBSP SOL"', () => {
    expect(cost(0)).toBe(`0.000${NBSP}SOL`)
  })
})

describe('signedStake', () => {
  it('zero → "0 NBSP SOL" (no sign prefix)', () => {
    expect(signedStake(0)).toBe(`0${NBSP}SOL`)
  })

  it('positive → "+N NBSP SOL"', () => {
    expect(signedStake(1500)).toBe(`+1,500${NBSP}SOL`)
  })

  it('negative → "−N NBSP SOL" (unicode minus U+2212, not hyphen)', () => {
    const result = signedStake(-2000)
    // Unicode minus (U+2212), not ASCII hyphen (U+002D)
    expect(result.startsWith('−')).toBe(true)
    expect(result).toContain(`2,000${NBSP}SOL`)
  })
})

describe('lamportsToSol', () => {
  it('1 SOL (1_000_000_000 lamports) → "1.000000000"', () => {
    expect(lamportsToSol('1000000000')).toBe('1.000000000')
  })

  it('short input pads with leading zeros', () => {
    // "1" → "0000000001" → "0.000000001"
    expect(lamportsToSol('1')).toBe('0.000000001')
  })

  it('exact 9-digit input inserts decimal at front', () => {
    expect(lamportsToSol('123456789')).toBe('0.123456789')
  })

  it('10-digit input splits into integer + fractional', () => {
    expect(lamportsToSol('1234567890')).toBe('1.234567890')
  })
})

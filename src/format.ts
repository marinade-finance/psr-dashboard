// Formatting layer. All display rounding lives here — services and
// components should NEVER `Math.round` a value before handing it to one of
// these functions. `toLocaleString` and `toFixed` both round half-away-from-
// zero, which is what we want for monetary display (matches what lodash.round
// used to do, without the dependency).

export const sol = (amount: number, digits = 0) =>
  amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

const pctString = (amount: number, fractionDigits: number = 2): string =>
  `${(100 * amount).toFixed(fractionDigits)}%`

export const pct = (
  amount: number,
  fractionDigits: number = 2,
  maxValue: number = 1e18,
): string => {
  if (amount >= maxValue) {
    return `>${pctString(maxValue, fractionDigits)}`
  } else if (amount <= -maxValue) {
    return `<-${pctString(maxValue, fractionDigits)}`
  }
  return pctString(amount, fractionDigits)
}

export const finite = (x: number | null | undefined): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : 0

export const pmpe = (x: number) => x.toFixed(5)
export const stake = (n: number) => `${sol(n, 0)} SOL`
export const pay = (n: number) => `${sol(n, 0)} SOL`
export const penalty = (n: number) => `${sol(n, 3)} SOL`
// Cost rows need 3-decimal precision — per-epoch bid costs are often
// sub-1 SOL and rounding them to "0" or "1" reads as wrong.
export const cost = (n: number) => `${sol(n, 3)} SOL`

// Top-up CTAs: never claim "Top up 0 SOL". Sub-1-SOL values show "<1 SOL".
export const stakeCta = (n: number): string => {
  if (n > 0 && n < 0.5) return '<1 SOL'
  return stake(n)
}
export const payCta = (n: number): string => {
  if (n > 0 && n < 0.5) return '<1 SOL'
  return pay(n)
}

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

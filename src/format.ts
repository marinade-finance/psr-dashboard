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
// NBSP ( ) between number and unit so "19,866 SOL" never wraps across
// a line break. Applies to every "<n> SOL" output below.
export const stake = (n: number) => `${sol(n, 0)} SOL`
export const pay = (n: number) => `${sol(n, 0)} SOL`
export const penalty = (n: number) => `${sol(n, 3)} SOL`
// Cost rows need 3-decimal precision — per-epoch bid costs are often
// sub-1 SOL and rounding them to "0" or "1" reads as wrong.
export const cost = (n: number) => `${sol(n, 3)} SOL`

// Signed stake delta — "+1,234 SOL" / "−1,234 SOL" / "0 SOL". Uses the
// minus-sign unicode (−) for the negative case so the typography matches
// "+" in width; zero falls through to stake() with no sign.
export const signedStake = (n: number) =>
  n === 0 ? stake(0) : `${n > 0 ? '+' : '−'}${stake(Math.abs(n))}`

// Top-up advice — SOL the user is told to deposit into their bond.
// ALWAYS rounds UP (ceil): advising a rounded-down top-up would leave the
// bond short, so the validator stays under-collateralised and the advice
// is wrong. Any n > 0 yields at least "1 SOL" (never "0 SOL" / "<1 SOL").
// Callers guard with `> 0`; n <= 0 is never displayed.
export const topUp = (n: number) => `${Math.ceil(n)} SOL`

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

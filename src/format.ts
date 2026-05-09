// Formatting layer. All display rounding lives here — services and
// components should NEVER `Math.round` a value before handing it to one of
// these functions. `toLocaleString` and `toFixed` both round half-away-from-
// zero, which is what we want for monetary display (matches what lodash.round
// used to do, without the dependency).

export const formatSolAmount = (amount: number, digits = 2) =>
  amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

const formatPercentageString = (
  amount: number,
  fractionDigits: number = 2,
): string => `${(100 * amount).toFixed(fractionDigits)}%`

export const formatPercentage = (
  amount: number,
  fractionDigits: number = 2,
  maxValue: number = 1e18,
): string => {
  if (amount >= maxValue) {
    return `>${formatPercentageString(maxValue, fractionDigits)}`
  } else if (amount <= -maxValue) {
    return `<-${formatPercentageString(maxValue, fractionDigits)}`
  }
  return formatPercentageString(amount, fractionDigits)
}

export const finite = (x: number | null | undefined): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : 0

export const pmpe = (x: number) => x.toFixed(5)
export const stake = (n: number) => `${formatSolAmount(n, 0)} SOL`
export const pay = (n: number) => `${formatSolAmount(n, 2)} SOL`

// Top-up CTAs: never claim "Top up 0 SOL". For positive sub-display values,
// floor to "<1" (whole-SOL display) or "<0.01" (cents display) so the call
// to action stays honest.
export const stakeCta = (n: number): string => {
  if (n > 0 && n < 0.5) return '<1 SOL'
  return stake(n)
}
export const payCta = (n: number): string => {
  if (n > 0 && n < 0.005) return '<0.01 SOL'
  return pay(n)
}

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

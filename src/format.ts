import round from 'lodash.round'

export const formatSolAmount = (amount: number, digits = 2) => round(amount, digits).toLocaleString()

export const formatPercentage = (amount: number, fractionDigits = 2) => {
  if (amount >= Infinity) {
    return '∞'
  } else if (amount <= -Infinity) {
    return '-∞'
  }
  return `${round(100 * amount, fractionDigits)}%`
}

export const lamportsToSol = (lamports: string) => lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

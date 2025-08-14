import round from 'lodash.round'

export const formatSolAmount = (amount: number, digits = 2) =>
  round(amount, digits).toLocaleString()

export const formatPercentage = (amount: number, fractionDigits: number = 2, maxValue: number = 1e18): string => {
  if (amount >= maxValue) {
    const maxValueLabel = formatPercentage(maxValue, fractionDigits, maxValue + 1)
    return `>${maxValueLabel}`
  } else if (amount <= -maxValue) {
    const maxValueLabel = formatPercentage(maxValue, fractionDigits, maxValue + 1)
    return `<-${maxValueLabel}`
  }
  const x = round(100 * amount, fractionDigits)
  const str = (fractionDigits > 0) ? x.toFixed(fractionDigits) : x
  return `${str}%`
}

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

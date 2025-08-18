import round from 'lodash.round'

export const formatSolAmount = (amount: number, digits = 2) =>
  round(amount, digits).toLocaleString()

export const formatPercentageString = (amount: number, fractionDigits: number = 2): string => {
  const x = round(100 * amount, fractionDigits)
  const str = (fractionDigits > 0) ? x.toFixed(fractionDigits) : x
  return `${str}%`
}

export const formatPercentage = (amount: number, fractionDigits: number = 2, maxValue: number = 1e18): string => {
  if (amount >= maxValue) {
    const maxValueLabel = formatPercentageString(maxValue, fractionDigits)
    return `>${maxValueLabel}`
  } else if (amount <= -maxValue) {
    const maxValueLabel = formatPercentageString(maxValue, fractionDigits)
    return `<-${maxValueLabel}`
  }
  return formatPercentageString(amount, fractionDigits)
}

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

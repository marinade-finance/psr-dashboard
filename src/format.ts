import round from 'lodash.round'

export const formatSolAmount = (amount: number, digits = 2) => Number(round(amount, digits)).toLocaleString()

export const formatPercentage = (amount: number, fractionDigits = 2) => `${round(100 * amount, fractionDigits)}%`

export const lamportsToSol = (lamports: string) => lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

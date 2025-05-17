export const formatSolAmount = (amount: number, digits = 2) => Number(amount.toFixed(digits)).toLocaleString()

export const formatPercentage = (amount: number, fractionDigits = 2) => `${(100 * amount).toFixed(fractionDigits)}%`

export const lamportsToSol = (lamports: string) => lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

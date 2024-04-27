export const formatSolAmount = (amount: number) => amount.toLocaleString()

export const formatPercentage = (amount: number) => `${(100 * amount).toFixed(2)}%`

export const lamportsToSol = (lamports: string) => lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')
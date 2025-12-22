export const formatSolAmount = (amount: number, digits = 2) =>
  round(amount, digits).toLocaleString()

export const formatPercentage = (amount: number, fractionDigits = 2) =>
  `${(100 * amount).toFixed(fractionDigits)}%`

export const lamportsToSol = (lamports: string) =>
  lamports.padStart(10, '0').replace(/(.{9})$/, '.$1')

export const lamportsNumberToSol = (lamports: number) =>
  lamportsToSol(Math.round(lamports).toString())

export const tooltipAttributes = (tooltipHtml: string) => ({
  'data-tooltip-id': 'tooltip',
  'data-tooltip-html': tooltipHtml,
})

export const LAMPORTS_PER_SOL = 1_000_000_000

const SECONDS_PER_YEAR = 365.25 * 24 * 3600
const EPOCH_DURATION = 0.4 * 432000
export const EPOCHS_PER_YEAR = SECONDS_PER_YEAR / EPOCH_DURATION

export const calcApy = (rewards: number, stake: number) => {
  if (stake <= 0) {
    return 0
  }
  return Math.pow(1 + rewards / stake, EPOCHS_PER_YEAR) - 1
}

const round = (number: number, precision = 0): number => {
  if (!isFinite(number)) return number
  const factor = 10 ** precision
  const result = Math.round(number * factor) / factor
  return result + 0 // to avoid -0
}

// TODO: To be possibly extended and used for Phase 2
// export const solAmountAndApy = (validator: Validator) => {
//   const { rewards: { totalRewardsSol }, stake: { totalActiveSol } } = validator
//   const apy = calcApy(totalRewardsSol, totalActiveSol)
//   return `${formatSolAmount(totalRewardsSol)} (${formatPercentage(apy)})`
// }

// configured in ops-infra of the institutional API service
export const MAX_EPOCH_RANGE = 20

export const alignEpochRange = (
  fromEpoch?: number,
  toEpoch?: number,
): { from: number; to: number } => {
  if (fromEpoch === undefined && toEpoch === undefined) {
    throw new Error('At least one of fromEpoch or toEpoch must be defined')
  }

  let from: number
  let to: number
  if (fromEpoch !== undefined && toEpoch !== undefined) {
    from = fromEpoch
    to = toEpoch
    if (to - from > MAX_EPOCH_RANGE) {
      from = to - MAX_EPOCH_RANGE
      console.warn(
        `Requested epoch range is too large, limiting to last ${MAX_EPOCH_RANGE} epochs: fromEpoch set to ${from}`,
      )
    }
  } else if (toEpoch !== undefined && fromEpoch === undefined) {
    to = toEpoch
    from = to - MAX_EPOCH_RANGE
  } else {
    // fromEpoch must be defined here
    from = Number(fromEpoch)
    to = from + MAX_EPOCH_RANGE
  }
  return { from, to }
}

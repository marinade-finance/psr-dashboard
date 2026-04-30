import { formatSolAmount } from 'src/format'

export const pmpe = (x: number) => x.toFixed(5)
export const stake = (n: number) => `${formatSolAmount(n, 0)} ☉`
export const pay = (n: number) => `${formatSolAmount(Math.round(n), 2)} ☉`
export const finite = (x: number | null | undefined): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : 0

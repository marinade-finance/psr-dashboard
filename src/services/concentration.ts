import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'

// How Marinade's SAM target stake spreads across a concentration dimension —
// the aggregate counterpart to ds-sam-calc's per-validator
// `selectValidatorConcentration`, which answers "how concentrated is MY group"
// one validator at a time. This answers "how is the whole auction spread".
//
// Grain: one row per group, weighted by SAM target stake (not validator
// count) — the caps are defined on stake share, so stake is what the cap line
// means.

// The auction caps two dimensions, each with its own limit. Both are read
// from config, never hardcoded: they differ (ASO 30%, country 40% as of
// epoch 1015) and they change.
export type ConcentrationDimension = 'aso' | 'country'

// Label for validators the validators-API has no value for on this dimension.
// They keep their stake in the total: dropping them would leave the shares
// summing to under 100% with nothing on screen explaining the gap.
const UNKNOWN = 'Unknown'

const OTHER = 'Other'

export type ConcentrationSlice = {
  group: string
  sol: number
  // Share of total SAM target stake, 0..1 — same scale as `capPct`.
  pctOfTotal: number
  validatorCount: number
  // True only for the folded remainder slice.
  isOther: boolean
  // Groups represented: 1 for a real group, N for the Other fold.
  groupCount: number
}

export type Concentration = {
  dimension: ConcentrationDimension
  // Chart-ready: top N groups, remainder folded into one Other slice.
  slices: ConcentrationSlice[]
  // Table-ready: every group, unfolded, same ranking.
  rows: ConcentrationSlice[]
  totalSol: number
  groupCount: number
  // The cap for THIS dimension, 0..1.
  capPct: number
}

const DEFAULT_TOP_N = 5

const capFor = (
  config: DsSamConfig,
  dimension: ConcentrationDimension,
): number =>
  dimension === 'aso'
    ? config.maxNetworkStakeConcentrationPerAsoDec
    : config.maxNetworkStakeConcentrationPerCountryDec

export const selectConcentration = (
  auctionResult: AuctionResult,
  config: DsSamConfig,
  dimension: ConcentrationDimension,
  topN: number = DEFAULT_TOP_N,
): Concentration => {
  const byGroup = new Map<string, { sol: number; validatorCount: number }>()
  let totalSol = 0

  for (const validator of auctionResult.auctionData.validators) {
    const sol = validator.auctionStake?.marinadeSamTargetSol ?? 0
    // Out-of-set validators sit in the auction data at zero target. They hold
    // no Marinade stake, so they must not inflate a group's validator count.
    if (sol <= 0) continue

    totalSol += sol
    const group =
      (dimension === 'aso' ? validator.aso : validator.country) ?? UNKNOWN
    const entry = byGroup.get(group) ?? { sol: 0, validatorCount: 0 }
    entry.sol += sol
    entry.validatorCount += 1
    byGroup.set(group, entry)
  }

  // Stake descending, name ascending on ties — a stable order, so a refetch
  // that returns equal-stake groups can't reshuffle the legend under the
  // reader.
  const rows: ConcentrationSlice[] = [...byGroup.entries()]
    .sort(([aGroup, a], [bGroup, b]) =>
      b.sol === a.sol ? aGroup.localeCompare(bGroup) : b.sol - a.sol,
    )
    .map(([group, { sol, validatorCount }]) => ({
      group,
      sol,
      pctOfTotal: totalSol > 0 ? sol / totalSol : 0,
      validatorCount,
      isOther: false,
      groupCount: 1,
    }))

  return {
    dimension,
    slices: foldTail(rows, topN, totalSol),
    rows,
    totalSol,
    groupCount: rows.length,
    capPct: capFor(config, dimension),
  }
}

// Past ~6 segments a donut stops being readable, so everything below the top N
// becomes one slice. A tail of exactly one is left as itself — an "Other" of
// one hides a name for no gain.
const foldTail = (
  rows: ConcentrationSlice[],
  topN: number,
  totalSol: number,
): ConcentrationSlice[] => {
  if (rows.length <= topN + 1) return rows

  const head = rows.slice(0, topN)
  const tail = rows.slice(topN)
  const sol = tail.reduce((acc, r) => acc + r.sol, 0)

  return [
    ...head,
    {
      group: OTHER,
      sol,
      pctOfTotal: totalSol > 0 ? sol / totalSol : 0,
      validatorCount: tail.reduce((acc, r) => acc + r.validatorCount, 0),
      isOther: true,
      groupCount: tail.length,
    },
  ]
}

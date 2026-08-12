import { z } from 'zod'

import { VALIDATORS_API_URL } from './apiUrls'
import { fetchJson } from './fetch-utils'

import type { ConcentrationDimension } from './concentration'

// Network-wide concentration from the validators API — every ASO and country
// on Solana with its share of total activated stake, not just the ones
// Marinade stakes to. It is the denominator the SAM split is read against: a
// group can be a third of Marinade's auction and a twentieth of the network,
// or the reverse, and only the pair tells you which.
//
// Note: the endpoint serves `dc_*_by_country` even though the generated Zod
// schema in `src/schemas/generated/validators.ts` omits it (the upstream
// OpenAPI spec is incomplete there). This module declares the fields it needs
// rather than waiting on a schema regen.

// `dc_concentration_by_*` is already a 0..1 fraction of
// `total_activated_stake`, so no division is needed here.
const DCConcentrationStatsSchema = z
  .object({
    epoch: z.number(),
    total_activated_stake: z.number(),
    dc_concentration_by_aso: z.record(z.number()),
    dc_concentration_by_country: z.record(z.number()),
  })
  .passthrough()

const ClusterStatsResponseSchema = z
  .object({
    cluster_stats: z
      .object({
        dc_concentration_stats: z.array(DCConcentrationStatsSchema),
      })
      .passthrough(),
  })
  .passthrough()

export type NetworkConcentration = {
  epoch: number
  totalActivatedStakeSol: number
  // Group name → share of network activated stake, 0..1. Keys match the
  // auction's `aso` / `country` values verbatim (both sides serve
  // "TeraSwitch Networks Inc." and "Germany"), so they join without mapping.
  shareByAso: Map<string, number>
  shareByCountry: Map<string, number>
}

const LAMPORTS_PER_SOL = 1e9

export const selectNetworkShares = (
  stats: NetworkConcentration | null,
  dimension: ConcentrationDimension,
): Map<string, number> | null => {
  if (!stats) return null
  return dimension === 'aso' ? stats.shareByAso : stats.shareByCountry
}

export const fetchNetworkConcentration = async (
  signal?: AbortSignal,
): Promise<NetworkConcentration | null> => {
  const body = await fetchJson(
    // One epoch only: the page shows a current snapshot, and the full history
    // is two orders of magnitude larger for no gain here.
    `${VALIDATORS_API_URL}/cluster-stats?epochs=1`,
    signal,
    raw => ClusterStatsResponseSchema.parse(raw),
  )

  const stats = body.cluster_stats.dc_concentration_stats
  if (stats.length === 0) return null

  // Defensive: take the newest epoch rather than trusting array order.
  const latest = stats.reduce((acc, s) => (s.epoch > acc.epoch ? s : acc))

  return {
    epoch: latest.epoch,
    totalActivatedStakeSol: latest.total_activated_stake / LAMPORTS_PER_SOL,
    shareByAso: new Map(Object.entries(latest.dc_concentration_by_aso)),
    shareByCountry: new Map(Object.entries(latest.dc_concentration_by_country)),
  }
}

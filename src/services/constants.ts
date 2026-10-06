// Shared numeric primitives moved to @marinade.finance/ds-sam-calc and
// @marinade.finance/ts-common; re-exported so existing imports from
// 'src/services/constants' keep resolving.
export { LAMPORTS_PER_SOL } from '@marinade.finance/ds-sam-calc'
export { pmpeToSol } from '@marinade.finance/ts-common'

import type { SettlementConfig } from '@marinade.finance/ds-sam-estimator'

// Last epoch where settled `ProtectedEvent`s were still emitted in dry-run.
// Anything after this is treated as a real settlement. Dashboard-only.
export const LAST_DRYRUN_EPOCH = 608

// Mirrors the live PSR entries of validator-bonds settlement-config.yaml.
export const PSR_SETTLEMENT_CONFIGS: readonly SettlementConfig[] = [
  {
    type: 'DowntimeRevenueImpactSettlement',
    meta: { funder: 'ValidatorBond' },
    min_settlement_lamports: 100_000_000,
    grace_downtime_bps: 100,
    covered_range_bps: [0, 10_000],
  },
  {
    type: 'CommissionSamIncreaseSettlement',
    meta: { funder: 'ValidatorBond' },
    min_settlement_lamports: 10_000_000,
    grace_increase_bps: 100,
    covered_range_bps: [0, 10_000],
    extra_penalty_threshold_bps: 700,
    base_markup_bps: 0,
    penalty_markup_bps: 0,
  },
]

import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

type ClusterStats = {
  block_production_stats: Array<BlockProductionStats>
  client_diversity_stats: Array<ClientDiversityStats>
  client_lineage_stats: Array<ClientLineageStats>
  dc_concentration_stats: Array<DCConcentrationStats>
  feature_set_stats: Array<FeatureSetStats>
}
type BlockProductionStats = {
  avg_skip_rate: number
  blocks_produced: number
  epoch: number
  leader_slots: number
}
type ClientDiversityStats = {
  client_share: {}
  client_stake: {}
  client_validator_count: {}
  epoch: number
  total_activated_stake: number
}
type ClientLineageStats = {
  epoch: number
  lineage_share: {}
  lineage_stake: {}
  lineage_validator_count: {}
  total_activated_stake: number
}
type DCConcentrationStats = {
  dc_concentration_by_asn: {}
  dc_concentration_by_aso: {}
  dc_concentration_by_city: {}
  dc_concentration_by_country: {}
  dc_stake_by_asn: {}
  dc_stake_by_aso: {}
  dc_stake_by_city: {}
  dc_stake_by_country: {}
  epoch: number
  total_activated_stake: number
}
type FeatureSetStats = {
  epoch: number
  feature_set_share: {}
  feature_set_stake: {}
  feature_set_validator_count: {}
  total_activated_stake: number
}
type ConfigStakes = {
  delegation_authorities: Array<StakeDelegationAuthorityRecord>
}
type StakeDelegationAuthorityRecord = {
  delegation_authority: string
  name: string
}
type EventEpochRecord = {
  downtime?: (number | null) | undefined
  epoch: number
  epoch_end_at?: (string | null) | undefined
  performance?: (null | PerformanceRecord) | undefined
  settlements: Array<SettlementRecord>
  uptime_pct?: (number | null) | undefined
}
type PerformanceRecord = {
  blocks_produced: number
  credits?: (number | null) | undefined
  leader_slots: number
  skip_rate?: (number | null) | undefined
}
type SettlementRecord = {
  amount: string
  meta: string
  reason: string
}
type GlobalUnstakeHintRecord = {
  hints: Array<UnstakeHint>
  vote_account: string
}
type UnstakeHint =
  | 'HighCommission'
  | 'HighCommissionInPreviousEpoch'
  | 'Blacklist'
  | 'LowCredits'
type GroupIncidentRecord = IncidentRecord & {
  validator: string
}
type IncidentRecord =
  | {
      block_production?: (null | BlockProductionDetail) | undefined
      downtime_seconds: number
      end_at: string
      epoch: number
      incident_type: 'Downtime'
      start_at: string
    }
  | {
      block_production: BlockProductionDetail
      epoch: number
      epoch_end_at: string
      epoch_start_at: string
      incident_type: 'BlockProduction'
    }
  | {
      changed_at: string
      commission_after: number
      commission_before: number
      epoch: number
      epoch_slot: number
      incident_type: 'CommissionSpike'
    }
  | {
      blocks_produced: number
      blocks_with_sandwiches: number
      cluster_median_rate: number
      epoch_end_at: string
      epoch_start_at: string
      first_epoch: number
      incident_type: 'Sandwich'
      last_epoch: number
      peak_epoch: number
      sandwich_rate_30d: number
      sandwich_rate_60d?: (number | null) | undefined
      threshold: number
    }
  | {
      client_lineage: string
      epoch: number
      epoch_end_at: string
      epoch_start_at: string
      incident_type: 'RunningLateClientVersion'
      newer_stake_share: number
      newer_version_stake_shares: Array<VersionStakeShare>
      version: string
    }
type BlockProductionDetail = {
  blocks_produced: number
  cluster_skip_rate: number
  counts_as_incident: boolean
  leader_slots: number
  missed_slots: number
  skip_rate: number
  threshold: number
}
type VersionStakeShare = {
  share: number
  version: string
}
type GroupIncidents = Array<GroupIncidentRecord> | number
type ResponseClients = {
  clients: Array<ValidatorGroupNode>
  current_epoch?: (number | null) | undefined
  net_apy_updated_at?: (string | null) | undefined
  total_activated_stake: string
  total_count: number
}
type ValidatorGroupNode = {
  children: Array<ValidatorGroupRecord>
  group: ValidatorClientGroupRecord
}
type ValidatorGroupRecord = {
  activating_stake?: (string | null) | undefined
  apy?: (number | null) | undefined
  commission?: (number | null) | undefined
  credits?: (number | null) | undefined
  deactivating_stake?: (string | null) | undefined
  delegation_relationship_count?: (number | null) | undefined
  expected_take_rate?: (number | null) | undefined
  incidents: GroupIncidents
  key: string
  marinade_score?: (number | null) | undefined
  net_apy?: (number | null) | undefined
  stake_delta_30d?: (string | null) | undefined
  stake_delta_7d?: (string | null) | undefined
  stake_share: number
  take_rate?: (number | null) | undefined
  total_stake: string
  uptime_pct?: (number | null) | undefined
  validator_count: number
  vote_reward_per_stake?: (number | null) | undefined
}
type ValidatorClientGroupRecord = ValidatorGroupRecord & {
  block_engine_vendors: Array<string>
  block_engines: Array<string>
  city_count: number
  country_count: number
  latest_release?: (null | ClientRelease) | undefined
  version_spread: Array<GroupShare>
}
type ClientRelease = {
  released_at?: (string | null) | undefined
  url?: (string | null) | undefined
  version: string
}
type GroupShare = {
  key: string
  stake_share: number
  total_stake: string
  validator_count: number
}
type ResponseClusterStats = {
  cluster_stats: ClusterStats
}
type ResponseCommissionChanges = {
  commission_changes: Array<CommissionChange>
}
type CommissionChange = {
  epoch: number
  epoch_slot: number
  from: number
  to: number
  vote_account: string
}
type ResponseCommissions = {
  commissions: Array<CommissionRecord>
}
type CommissionRecord = {
  commission: number
  created_at: string
  epoch: number
  epoch_end_at: string
  epoch_slot: number
  epoch_start_at: string
}
type ResponseConfig = {
  stakes: ConfigStakes
}
type ResponseEvents = {
  events: Array<EventEpochRecord>
}
type ResponseGlobalUnstakeHints = {
  unstake_hints: Array<GlobalUnstakeHintRecord>
}
type ResponseJito = {
  validators: Array<JitoRecord>
}
type JitoRecord = {
  epoch: string
  mev_commission_bps?: (number | null) | undefined
  priority_commission_bps?: (number | null) | undefined
  priority_total_lamports_transferred?: (number | null) | undefined
  vote_account: string
}
type ResponseJitoMev = {
  validators: Array<JitoMevRecord>
}
type JitoMevRecord = {
  epoch: string
  mev_commission_bps: number
  vote_account: string
}
type ResponseProviders = {
  current_epoch?: (number | null) | undefined
  net_apy_updated_at?: (string | null) | undefined
  providers: Array<ValidatorProviderGroupRecord>
  total_activated_stake: string
  total_count: number
}
type ValidatorProviderGroupRecord = ValidatorGroupRecord & {
  asns: Array<number>
  client_mix: Array<GroupShare>
  locations: Array<GroupLocation>
  superminority_count: number
}
type GroupLocation = {
  city?: (string | null) | undefined
  country: string
  total_stake: string
  validator_count: number
}
type ResponseReleases = {
  feature_gate_floors: Array<FeatureGateFloor>
  releases: Array<ReleaseRecord>
  sfdp_floors: Array<SfdpFloor>
}
type FeatureGateFloor = {
  client_lineage: string
  client_version: string
  effective_epoch: number
}
type ReleaseRecord = {
  available_epoch?: (number | null) | undefined
  client_lineage: string
  client_version: string
  release_url?: (string | null) | undefined
  released_at?: (string | null) | undefined
  updated_at: string
}
type SfdpFloor = {
  client_lineage: string
  client_version: string
  effective_epoch: number
}
type ResponseReportStaking = {
  planned: Array<Stake>
}
type Stake = {
  current_stake: number
  identity: string
  next_stake: number
  vote_account: string
}
type ResponseScoreBreakdown = {
  score_breakdown: ScoreBreakdown
}
type ScoreBreakdown = {
  component_ranks: Array<number>
  component_scores: Array<number>
  component_values: Array<string | null>
  component_weights: Array<number>
  components: Array<string>
  created_at: string
  eligible_stake_algo: boolean
  eligible_stake_mnde: boolean
  eligible_stake_msol: boolean
  eligible_stake_vemnde: boolean
  epoch: number
  min_score_eligible_algo?: (number | null) | undefined
  msol_votes: number
  rank: number
  score: number
  scoring_run_id: number
  target_stake_algo: number
  target_stake_mnde: number
  target_stake_msol: number
  target_stake_vemnde: number
  ui_hints: Array<string>
  ui_id: string
  vemnde_votes: number
  vote_account: string
}
type ResponseScoreBreakdowns = {
  score_breakdowns: Array<ScoreBreakdown>
}
type ResponseScores = {
  scores: Array<ValidatorScoreRecord>
}
type ValidatorScoreRecord = {
  component_ranks: Array<number>
  component_scores: Array<number>
  component_values: Array<string | null>
  created_at: string
  eligible_stake_algo: boolean
  eligible_stake_msol: boolean
  eligible_stake_vemnde: boolean
  msol_votes: number
  rank: number
  score: number
  scoring_run_id: number
  target_stake_algo: number
  target_stake_msol: number
  target_stake_vemnde: number
  ui_hints: Array<string>
  vemnde_votes: number
  vote_account: string
}
type ResponseTakeRates = {
  take_rates: Array<TakeRateRecord>
}
type TakeRateRecord = {
  created_at: string
  epoch: number
  epoch_end_at?: (string | null) | undefined
  epoch_start_at?: (string | null) | undefined
  expected_take_rate?: (number | null) | undefined
  realized_take_rate: number
}
type ResponseUnstakeHints = {
  unstake_hints: Array<UnstakeHintRecord>
}
type UnstakeHintRecord = {
  hints: Array<UnstakeHint>
  marinade_stake: number
  vote_account: string
}
type ResponseUptimes = {
  uptimes: Array<UptimeRecord>
}
type UptimeRecord = {
  end_at: string
  epoch: number
  epoch_end_at: string
  epoch_start_at: string
  start_at: string
  status: string
}
type ResponseValidators = {
  bond_flags_updated_at?: (string | null) | undefined
  current_epoch?: (number | null) | undefined
  net_apy_updated_at?: (string | null) | undefined
  operators?: (Array<ValidatorGroupRecord> | null) | undefined
  total_activated_stake?: (string | null) | undefined
  total_count: number
  validators: Array<ValidatorRecord>
  validators_aggregated: Array<ValidatorsAggregated>
}
type ValidatorRecord = {
  activated_stake: string
  activating_stake?: (string | null) | undefined
  avg_apy?: (number | null) | undefined
  avg_take_rate?: (number | null) | undefined
  avg_uptime_pct?: (number | null) | undefined
  block_revenue_collector?: (string | null) | undefined
  block_revenue_collector_healthy?: (boolean | null) | undefined
  block_revenue_collector_is_identity?: (boolean | null) | undefined
  block_revenue_collector_shared_count?: (number | null) | undefined
  block_revenue_commission_bps?: (number | null) | undefined
  client_id?: (number | null) | undefined
  client_id_raw?: (string | null) | undefined
  client_label: string
  client_lineage?: (string | null) | undefined
  client_name: string
  client_vendor?: (string | null) | undefined
  commission_advertised?: (number | null) | undefined
  commission_aggregated?: (number | null) | undefined
  commission_effective?: (number | null) | undefined
  commission_effective_bps?: (number | null) | undefined
  commission_effective_source?: (string | null) | undefined
  commission_max_observed?: (number | null) | undefined
  commission_min_observed?: (number | null) | undefined
  credits?: (number | null) | undefined
  dc_asn?: (number | null) | undefined
  dc_aso?: (string | null) | undefined
  dc_city?: (string | null) | undefined
  dc_continent?: (string | null) | undefined
  dc_coordinates_lat?: (number | null) | undefined
  dc_coordinates_lon?: (number | null) | undefined
  dc_country?: (string | null) | undefined
  dc_country_iso?: (string | null) | undefined
  dc_full_city?: (string | null) | undefined
  dcc_asn?: (number | null) | undefined
  dcc_aso?: (number | null) | undefined
  dcc_country?: (number | null) | undefined
  dcc_full_city?: (number | null) | undefined
  deactivating_stake?: (string | null) | undefined
  direct_activating_stake?: (string | null) | undefined
  direct_deactivating_stake?: (string | null) | undefined
  direct_stake?: (string | null) | undefined
  epoch_stats: Array<ValidatorEpochStats>
  epochs_count: number
  expected_take_rate?: (number | null) | undefined
  feature_set?: (number | null) | undefined
  foundation_stake: string
  gossip_port?: (number | null) | undefined
  has_last_epoch_stats: boolean
  identity: string
  incidents: Array<IncidentRecord>
  inflation_rewards_collector?: (string | null) | undefined
  inflation_rewards_collector_healthy?: (boolean | null) | undefined
  inflation_rewards_collector_redirected?: (boolean | null) | undefined
  inflation_rewards_collector_shared_count?: (number | null) | undefined
  inflation_rewards_commission_bps?: (number | null) | undefined
  inflation_rewards_commission_bps_is_v4?: (boolean | null) | undefined
  info_icon_url?: (string | null) | undefined
  info_keybase?: (string | null) | undefined
  info_name?: (string | null) | undefined
  info_url?: (string | null) | undefined
  institutional_stake: string
  marinade_native_stake: string
  marinade_stake: string
  net_apy?: (number | null) | undefined
  node_ip?: (string | null) | undefined
  operator?: (string | null) | undefined
  pending_delegator_rewards?: (string | null) | undefined
  protected?: boolean | undefined
  pubsub_public?: (boolean | null) | undefined
  rpc_public?: (boolean | null) | undefined
  rugged_commission: boolean
  rugged_commission_info: Array<RugInfo>
  rugged_commission_occurrences: number
  score?: (number | null) | undefined
  self_stake: string
  shred_version?: (number | null) | undefined
  stake_delta_30d?: (string | null) | undefined
  stake_delta_7d?: (string | null) | undefined
  start_date?: (string | null) | undefined
  start_epoch: number
  superminority: boolean
  unique_delegators?: (number | null) | undefined
  verified?: boolean | undefined
  version?: (string | null) | undefined
  vote_account: string
  vote_reward_lamports?: (number | null) | undefined
  warnings: Array<ValidatorWarning>
}
type ValidatorEpochStats = {
  activated_stake: string
  apr?: (number | null) | undefined
  apy?: (number | null) | undefined
  block_revenue_collector?: (string | null) | undefined
  block_revenue_collector_healthy?: (boolean | null) | undefined
  block_revenue_collector_is_identity?: (boolean | null) | undefined
  block_revenue_collector_shared_count?: (number | null) | undefined
  block_revenue_commission_bps?: (number | null) | undefined
  blocks_produced: number
  client_id?: (number | null) | undefined
  client_id_raw?: (string | null) | undefined
  client_label: string
  client_lineage?: (string | null) | undefined
  client_name: string
  client_vendor?: (string | null) | undefined
  commission_advertised?: (number | null) | undefined
  commission_effective?: (number | null) | undefined
  commission_effective_source?: (string | null) | undefined
  commission_max_observed?: (number | null) | undefined
  commission_min_observed?: (number | null) | undefined
  credits?: (number | null) | undefined
  dc_asn?: (number | null) | undefined
  dc_aso?: (string | null) | undefined
  dc_city?: (string | null) | undefined
  dc_country?: (string | null) | undefined
  direct_activating_stake?: (string | null) | undefined
  direct_deactivating_stake?: (string | null) | undefined
  direct_stake?: (string | null) | undefined
  downtime?: (number | null) | undefined
  epoch: number
  epoch_end_at?: (string | null) | undefined
  epoch_start_at?: (string | null) | undefined
  feature_set?: (number | null) | undefined
  foundation_stake: string
  gossip_port?: (number | null) | undefined
  inflation_rewards_collector?: (string | null) | undefined
  inflation_rewards_collector_healthy?: (boolean | null) | undefined
  inflation_rewards_collector_redirected?: (boolean | null) | undefined
  inflation_rewards_collector_shared_count?: (number | null) | undefined
  inflation_rewards_commission_bps?: (number | null) | undefined
  inflation_rewards_commission_bps_is_v4?: (boolean | null) | undefined
  institutional_stake: string
  leader_slots: number
  marinade_native_stake: string
  marinade_stake: string
  mev_commission_bps?: (number | null) | undefined
  pending_delegator_rewards?: (string | null) | undefined
  priority_commission_bps?: (number | null) | undefined
  pubsub_public?: (boolean | null) | undefined
  rank_activated_stake?: (number | null) | undefined
  rank_apy?: (number | null) | undefined
  rank_score?: (number | null) | undefined
  rpc_public?: (boolean | null) | undefined
  score?: (number | null) | undefined
  self_stake: string
  shred_version?: (number | null) | undefined
  skip_rate?: (number | null) | undefined
  stake_to_become_superminority: string
  superminority: boolean
  uptime?: (number | null) | undefined
  uptime_pct?: (number | null) | undefined
  version?: (string | null) | undefined
  vote_reward_lamports?: (number | null) | undefined
}
type RugInfo = {
  after: number
  before: number
  epoch: number
}
type ValidatorWarning = 'HighCommission' | 'Superminority' | 'LowUptime'
type ValidatorsAggregated = {
  avg_apy?: (number | null) | undefined
  avg_marinade_score?: (number | null) | undefined
  epoch: number
  epoch_start_date?: (string | null) | undefined
}
type ResponseValidatorsBlockRewards = {
  validators: Array<ValidatorBlockRewardsRecord>
}
type ValidatorBlockRewardsRecord = {
  amount: string
  authorized_voter: string
  epoch: number
  identity_account: string
  vote_account: string
}
type ResponseVersions = {
  versions: Array<VersionRecord>
}
type VersionRecord = {
  client_id?: (number | null) | undefined
  client_id_raw?: (string | null) | undefined
  client_label: string
  client_lineage?: (string | null) | undefined
  client_name: string
  client_vendor?: (string | null) | undefined
  created_at: string
  epoch: number
  feature_set?: (number | null) | undefined
  shred_version?: (number | null) | undefined
  version?: (string | null) | undefined
}

const ResponseAdminWorkflowMetrics = z
  .object({ message: z.string() })
  .passthrough()
const ResponseAdminScoreUpload = z
  .object({ rows_processed: z.number().int().gte(0) })
  .passthrough()
const BlockProductionDetail: z.ZodType<BlockProductionDetail> = z
  .object({
    blocks_produced: z.number().int().gte(0),
    cluster_skip_rate: z.number(),
    counts_as_incident: z.boolean(),
    leader_slots: z.number().int().gte(0),
    missed_slots: z.number().int().gte(0),
    skip_rate: z.number(),
    threshold: z.number(),
  })
  .passthrough()
const VersionStakeShare: z.ZodType<VersionStakeShare> = z
  .object({ share: z.number(), version: z.string() })
  .passthrough()
const IncidentRecord = z.union([
  z
    .object({
      block_production: z.union([z.null(), BlockProductionDetail]).optional(),
      downtime_seconds: z.number().int().gte(0),
      end_at: z.string().datetime({ offset: true }),
      epoch: z.number().int().gte(0),
      incident_type: z.literal('Downtime'),
      start_at: z.string().datetime({ offset: true }),
    })
    .passthrough(),
  z
    .object({
      block_production: BlockProductionDetail,
      epoch: z.number().int().gte(0),
      epoch_end_at: z.string().datetime({ offset: true }),
      epoch_start_at: z.string().datetime({ offset: true }),
      incident_type: z.literal('BlockProduction'),
    })
    .passthrough(),
  z
    .object({
      changed_at: z.string().datetime({ offset: true }),
      commission_after: z.number().int().gte(0),
      commission_before: z.number().int().gte(0),
      epoch: z.number().int().gte(0),
      epoch_slot: z.number().int().gte(0),
      incident_type: z.literal('CommissionSpike'),
    })
    .passthrough(),
  z
    .object({
      blocks_produced: z.number().int().gte(0),
      blocks_with_sandwiches: z.number().int().gte(0),
      cluster_median_rate: z.number(),
      epoch_end_at: z.string().datetime({ offset: true }),
      epoch_start_at: z.string().datetime({ offset: true }),
      first_epoch: z.number().int().gte(0),
      incident_type: z.literal('Sandwich'),
      last_epoch: z.number().int().gte(0),
      peak_epoch: z.number().int().gte(0),
      sandwich_rate_30d: z.number(),
      sandwich_rate_60d: z.union([z.number(), z.null()]).optional(),
      threshold: z.number(),
    })
    .passthrough(),
  z
    .object({
      client_lineage: z.string(),
      epoch: z.number().int().gte(0),
      epoch_end_at: z.string().datetime({ offset: true }),
      epoch_start_at: z.string().datetime({ offset: true }),
      incident_type: z.literal('RunningLateClientVersion'),
      newer_stake_share: z.number(),
      newer_version_stake_shares: z.array(VersionStakeShare),
      version: z.string(),
    })
    .passthrough(),
])
const GroupIncidentRecord: z.ZodType<GroupIncidentRecord> = IncidentRecord.and(
  z.object({ validator: z.string() }).passthrough(),
)
const GroupIncidents: z.ZodType<GroupIncidents> = z.union([
  z.array(GroupIncidentRecord),
  z.number(),
])
const ValidatorGroupRecord: z.ZodType<ValidatorGroupRecord> = z
  .object({
    activating_stake: z.union([z.string(), z.null()]).optional(),
    apy: z.union([z.number(), z.null()]).optional(),
    commission: z.union([z.number(), z.null()]).optional(),
    credits: z.union([z.number(), z.null()]).optional(),
    deactivating_stake: z.union([z.string(), z.null()]).optional(),
    delegation_relationship_count: z.union([z.number(), z.null()]).optional(),
    expected_take_rate: z.union([z.number(), z.null()]).optional(),
    incidents: GroupIncidents,
    key: z.string(),
    marinade_score: z.union([z.number(), z.null()]).optional(),
    net_apy: z.union([z.number(), z.null()]).optional(),
    stake_delta_30d: z.union([z.string(), z.null()]).optional(),
    stake_delta_7d: z.union([z.string(), z.null()]).optional(),
    stake_share: z.number(),
    take_rate: z.union([z.number(), z.null()]).optional(),
    total_stake: z.string(),
    uptime_pct: z.union([z.number(), z.null()]).optional(),
    validator_count: z.number().int().gte(0),
    vote_reward_per_stake: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough()
const ClientRelease: z.ZodType<ClientRelease> = z
  .object({
    released_at: z.union([z.string(), z.null()]).optional(),
    url: z.union([z.string(), z.null()]).optional(),
    version: z.string(),
  })
  .passthrough()
const GroupShare: z.ZodType<GroupShare> = z
  .object({
    key: z.string(),
    stake_share: z.number(),
    total_stake: z.string(),
    validator_count: z.number().int().gte(0),
  })
  .passthrough()
const ValidatorClientGroupRecord = ValidatorGroupRecord.and(
  z
    .object({
      block_engine_vendors: z.array(z.string()),
      block_engines: z.array(z.string()),
      city_count: z.number().int().gte(0),
      country_count: z.number().int().gte(0),
      latest_release: z.union([z.null(), ClientRelease]).optional(),
      version_spread: z.array(GroupShare),
    })
    .passthrough(),
)
const ValidatorGroupNode: z.ZodType<ValidatorGroupNode> = z
  .object({
    children: z.array(ValidatorGroupRecord),
    group: ValidatorClientGroupRecord,
  })
  .passthrough()
const ResponseClients: z.ZodType<ResponseClients> = z
  .object({
    clients: z.array(ValidatorGroupNode),
    current_epoch: z.union([z.number(), z.null()]).optional(),
    net_apy_updated_at: z.union([z.string(), z.null()]).optional(),
    total_activated_stake: z.string(),
    total_count: z.number().int().gte(0),
  })
  .passthrough()
const BlockProductionStats: z.ZodType<BlockProductionStats> = z
  .object({
    avg_skip_rate: z.number(),
    blocks_produced: z.number().int().gte(0),
    epoch: z.number().int().gte(0),
    leader_slots: z.number().int().gte(0),
  })
  .passthrough()
const ClientDiversityStats: z.ZodType<ClientDiversityStats> = z
  .object({
    client_share: z.record(z.number()),
    client_stake: z.record(z.number().int().gte(0)),
    client_validator_count: z.record(z.number().int().gte(0)),
    epoch: z.number().int().gte(0),
    total_activated_stake: z.number().int().gte(0),
  })
  .passthrough()
const ClientLineageStats: z.ZodType<ClientLineageStats> = z
  .object({
    epoch: z.number().int().gte(0),
    lineage_share: z.record(z.number()),
    lineage_stake: z.record(z.number().int().gte(0)),
    lineage_validator_count: z.record(z.number().int().gte(0)),
    total_activated_stake: z.number().int().gte(0),
  })
  .passthrough()
const DCConcentrationStats: z.ZodType<DCConcentrationStats> = z
  .object({
    dc_concentration_by_asn: z.record(z.number()),
    dc_concentration_by_aso: z.record(z.number()),
    dc_concentration_by_city: z.record(z.number()),
    dc_concentration_by_country: z.record(z.number()),
    dc_stake_by_asn: z.record(z.number().int().gte(0)),
    dc_stake_by_aso: z.record(z.number().int().gte(0)),
    dc_stake_by_city: z.record(z.number().int().gte(0)),
    dc_stake_by_country: z.record(z.number().int().gte(0)),
    epoch: z.number().int().gte(0),
    total_activated_stake: z.number().int().gte(0),
  })
  .passthrough()
const FeatureSetStats: z.ZodType<FeatureSetStats> = z
  .object({
    epoch: z.number().int().gte(0),
    feature_set_share: z.record(z.number()),
    feature_set_stake: z.record(z.number().int().gte(0)),
    feature_set_validator_count: z.record(z.number().int().gte(0)),
    total_activated_stake: z.number().int().gte(0),
  })
  .passthrough()
const ClusterStats: z.ZodType<ClusterStats> = z
  .object({
    block_production_stats: z.array(BlockProductionStats),
    client_diversity_stats: z.array(ClientDiversityStats),
    client_lineage_stats: z.array(ClientLineageStats),
    dc_concentration_stats: z.array(DCConcentrationStats),
    feature_set_stats: z.array(FeatureSetStats),
  })
  .passthrough()
const ResponseClusterStats: z.ZodType<ResponseClusterStats> = z
  .object({ cluster_stats: ClusterStats })
  .passthrough()
const UnstakeHint = z.enum([
  'HighCommission',
  'HighCommissionInPreviousEpoch',
  'Blacklist',
  'LowCredits',
])
const GlobalUnstakeHintRecord: z.ZodType<GlobalUnstakeHintRecord> = z
  .object({ hints: z.array(UnstakeHint), vote_account: z.string() })
  .passthrough()
const ResponseGlobalUnstakeHints: z.ZodType<ResponseGlobalUnstakeHints> = z
  .object({ unstake_hints: z.array(GlobalUnstakeHintRecord) })
  .passthrough()
const JitoRecord: z.ZodType<JitoRecord> = z
  .object({
    epoch: z.string(),
    mev_commission_bps: z.union([z.number(), z.null()]).optional(),
    priority_commission_bps: z.union([z.number(), z.null()]).optional(),
    priority_total_lamports_transferred: z
      .union([z.number(), z.null()])
      .optional(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseJito: z.ZodType<ResponseJito> = z
  .object({ validators: z.array(JitoRecord) })
  .passthrough()
const JitoMevRecord: z.ZodType<JitoMevRecord> = z
  .object({
    epoch: z.string(),
    mev_commission_bps: z.number().int(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseJitoMev: z.ZodType<ResponseJitoMev> = z
  .object({ validators: z.array(JitoMevRecord) })
  .passthrough()
const GroupLocation: z.ZodType<GroupLocation> = z
  .object({
    city: z.union([z.string(), z.null()]).optional(),
    country: z.string(),
    total_stake: z.string(),
    validator_count: z.number().int().gte(0),
  })
  .passthrough()
const ValidatorProviderGroupRecord = ValidatorGroupRecord.and(
  z
    .object({
      asns: z.array(z.number().int()),
      client_mix: z.array(GroupShare),
      locations: z.array(GroupLocation),
      superminority_count: z.number().int().gte(0),
    })
    .passthrough(),
)
const ResponseProviders: z.ZodType<ResponseProviders> = z
  .object({
    current_epoch: z.union([z.number(), z.null()]).optional(),
    net_apy_updated_at: z.union([z.string(), z.null()]).optional(),
    providers: z.array(ValidatorProviderGroupRecord),
    total_activated_stake: z.string(),
    total_count: z.number().int().gte(0),
  })
  .passthrough()
const FeatureGateFloor: z.ZodType<FeatureGateFloor> = z
  .object({
    client_lineage: z.string(),
    client_version: z.string(),
    effective_epoch: z.number().int().gte(0),
  })
  .passthrough()
const ReleaseRecord: z.ZodType<ReleaseRecord> = z
  .object({
    available_epoch: z.union([z.number(), z.null()]).optional(),
    client_lineage: z.string(),
    client_version: z.string(),
    release_url: z.union([z.string(), z.null()]).optional(),
    released_at: z.union([z.string(), z.null()]).optional(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .passthrough()
const SfdpFloor: z.ZodType<SfdpFloor> = z
  .object({
    client_lineage: z.string(),
    client_version: z.string(),
    effective_epoch: z.number().int().gte(0),
  })
  .passthrough()
const ResponseReleases: z.ZodType<ResponseReleases> = z
  .object({
    feature_gate_floors: z.array(FeatureGateFloor),
    releases: z.array(ReleaseRecord),
    sfdp_floors: z.array(SfdpFloor),
  })
  .passthrough()
const ResponseReportScoring = z
  .object({ reports: z.object({}).partial().passthrough() })
  .passthrough()
const Stake: z.ZodType<Stake> = z
  .object({
    current_stake: z.number().int().gte(0),
    identity: z.string(),
    next_stake: z.number().int().gte(0),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseReportStaking: z.ZodType<ResponseReportStaking> = z
  .object({ planned: z.array(Stake) })
  .passthrough()
const ResponseRewards = z
  .object({
    rewards_block: z.array(z.array(z.any())),
    rewards_inflation_est: z.array(z.array(z.any())),
    rewards_jito_priority: z.array(z.array(z.any())),
    rewards_mev: z.array(z.array(z.any())),
    slots_per_year: z.array(z.array(z.any())),
  })
  .passthrough()
const StakeDelegationAuthorityRecord: z.ZodType<StakeDelegationAuthorityRecord> =
  z.object({ delegation_authority: z.string(), name: z.string() }).passthrough()
const ConfigStakes: z.ZodType<ConfigStakes> = z
  .object({ delegation_authorities: z.array(StakeDelegationAuthorityRecord) })
  .passthrough()
const ResponseConfig: z.ZodType<ResponseConfig> = z
  .object({ stakes: ConfigStakes })
  .passthrough()
const UnstakeHintRecord: z.ZodType<UnstakeHintRecord> = z
  .object({
    hints: z.array(UnstakeHint),
    marinade_stake: z.number(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseUnstakeHints: z.ZodType<ResponseUnstakeHints> = z
  .object({ unstake_hints: z.array(UnstakeHintRecord) })
  .passthrough()
const ValidatorEpochStats: z.ZodType<ValidatorEpochStats> = z
  .object({
    activated_stake: z.string(),
    apr: z.union([z.number(), z.null()]).optional(),
    apy: z.union([z.number(), z.null()]).optional(),
    block_revenue_collector: z.union([z.string(), z.null()]).optional(),
    block_revenue_collector_healthy: z
      .union([z.boolean(), z.null()])
      .optional(),
    block_revenue_collector_is_identity: z
      .union([z.boolean(), z.null()])
      .optional(),
    block_revenue_collector_shared_count: z
      .union([z.number(), z.null()])
      .optional(),
    block_revenue_commission_bps: z.union([z.number(), z.null()]).optional(),
    blocks_produced: z.number().int().gte(0),
    client_id: z.union([z.number(), z.null()]).optional(),
    client_id_raw: z.union([z.string(), z.null()]).optional(),
    client_label: z.string(),
    client_lineage: z.union([z.string(), z.null()]).optional(),
    client_name: z.string(),
    client_vendor: z.union([z.string(), z.null()]).optional(),
    commission_advertised: z.union([z.number(), z.null()]).optional(),
    commission_effective: z.union([z.number(), z.null()]).optional(),
    commission_effective_source: z.union([z.string(), z.null()]).optional(),
    commission_max_observed: z.union([z.number(), z.null()]).optional(),
    commission_min_observed: z.union([z.number(), z.null()]).optional(),
    credits: z.union([z.number(), z.null()]).optional(),
    dc_asn: z.union([z.number(), z.null()]).optional(),
    dc_aso: z.union([z.string(), z.null()]).optional(),
    dc_city: z.union([z.string(), z.null()]).optional(),
    dc_country: z.union([z.string(), z.null()]).optional(),
    direct_activating_stake: z.union([z.string(), z.null()]).optional(),
    direct_deactivating_stake: z.union([z.string(), z.null()]).optional(),
    direct_stake: z.union([z.string(), z.null()]).optional(),
    downtime: z.union([z.number(), z.null()]).optional(),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.union([z.string(), z.null()]).optional(),
    epoch_start_at: z.union([z.string(), z.null()]).optional(),
    feature_set: z.union([z.number(), z.null()]).optional(),
    foundation_stake: z.string(),
    gossip_port: z.union([z.number(), z.null()]).optional(),
    inflation_rewards_collector: z.union([z.string(), z.null()]).optional(),
    inflation_rewards_collector_healthy: z
      .union([z.boolean(), z.null()])
      .optional(),
    inflation_rewards_collector_redirected: z
      .union([z.boolean(), z.null()])
      .optional(),
    inflation_rewards_collector_shared_count: z
      .union([z.number(), z.null()])
      .optional(),
    inflation_rewards_commission_bps: z
      .union([z.number(), z.null()])
      .optional(),
    inflation_rewards_commission_bps_is_v4: z
      .union([z.boolean(), z.null()])
      .optional(),
    institutional_stake: z.string(),
    leader_slots: z.number().int().gte(0),
    marinade_native_stake: z.string(),
    marinade_stake: z.string(),
    mev_commission_bps: z.union([z.number(), z.null()]).optional(),
    pending_delegator_rewards: z.union([z.string(), z.null()]).optional(),
    priority_commission_bps: z.union([z.number(), z.null()]).optional(),
    pubsub_public: z.union([z.boolean(), z.null()]).optional(),
    rank_activated_stake: z.union([z.number(), z.null()]).optional(),
    rank_apy: z.union([z.number(), z.null()]).optional(),
    rank_score: z.union([z.number(), z.null()]).optional(),
    rpc_public: z.union([z.boolean(), z.null()]).optional(),
    score: z.union([z.number(), z.null()]).optional(),
    self_stake: z.string(),
    shred_version: z.union([z.number(), z.null()]).optional(),
    skip_rate: z.union([z.number(), z.null()]).optional(),
    stake_to_become_superminority: z.string(),
    superminority: z.boolean(),
    uptime: z.union([z.number(), z.null()]).optional(),
    uptime_pct: z.union([z.number(), z.null()]).optional(),
    version: z.union([z.string(), z.null()]).optional(),
    vote_reward_lamports: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough()
const RugInfo: z.ZodType<RugInfo> = z
  .object({
    after: z.number().int().gte(0),
    before: z.number().int().gte(0),
    epoch: z.number().int().gte(0),
  })
  .passthrough()
const ValidatorWarning = z.enum([
  'HighCommission',
  'Superminority',
  'LowUptime',
])
const ValidatorRecord: z.ZodType<ValidatorRecord> = z
  .object({
    activated_stake: z.string(),
    activating_stake: z.union([z.string(), z.null()]).optional(),
    avg_apy: z.union([z.number(), z.null()]).optional(),
    avg_take_rate: z.union([z.number(), z.null()]).optional(),
    avg_uptime_pct: z.union([z.number(), z.null()]).optional(),
    block_revenue_collector: z.union([z.string(), z.null()]).optional(),
    block_revenue_collector_healthy: z
      .union([z.boolean(), z.null()])
      .optional(),
    block_revenue_collector_is_identity: z
      .union([z.boolean(), z.null()])
      .optional(),
    block_revenue_collector_shared_count: z
      .union([z.number(), z.null()])
      .optional(),
    block_revenue_commission_bps: z.union([z.number(), z.null()]).optional(),
    client_id: z.union([z.number(), z.null()]).optional(),
    client_id_raw: z.union([z.string(), z.null()]).optional(),
    client_label: z.string(),
    client_lineage: z.union([z.string(), z.null()]).optional(),
    client_name: z.string(),
    client_vendor: z.union([z.string(), z.null()]).optional(),
    commission_advertised: z.union([z.number(), z.null()]).optional(),
    commission_aggregated: z.union([z.number(), z.null()]).optional(),
    commission_effective: z.union([z.number(), z.null()]).optional(),
    commission_effective_bps: z.union([z.number(), z.null()]).optional(),
    commission_effective_source: z.union([z.string(), z.null()]).optional(),
    commission_max_observed: z.union([z.number(), z.null()]).optional(),
    commission_min_observed: z.union([z.number(), z.null()]).optional(),
    credits: z.union([z.number(), z.null()]).optional(),
    dc_asn: z.union([z.number(), z.null()]).optional(),
    dc_aso: z.union([z.string(), z.null()]).optional(),
    dc_city: z.union([z.string(), z.null()]).optional(),
    dc_continent: z.union([z.string(), z.null()]).optional(),
    dc_coordinates_lat: z.union([z.number(), z.null()]).optional(),
    dc_coordinates_lon: z.union([z.number(), z.null()]).optional(),
    dc_country: z.union([z.string(), z.null()]).optional(),
    dc_country_iso: z.union([z.string(), z.null()]).optional(),
    dc_full_city: z.union([z.string(), z.null()]).optional(),
    dcc_asn: z.union([z.number(), z.null()]).optional(),
    dcc_aso: z.union([z.number(), z.null()]).optional(),
    dcc_country: z.union([z.number(), z.null()]).optional(),
    dcc_full_city: z.union([z.number(), z.null()]).optional(),
    deactivating_stake: z.union([z.string(), z.null()]).optional(),
    direct_activating_stake: z.union([z.string(), z.null()]).optional(),
    direct_deactivating_stake: z.union([z.string(), z.null()]).optional(),
    direct_stake: z.union([z.string(), z.null()]).optional(),
    epoch_stats: z.array(ValidatorEpochStats),
    epochs_count: z.number().int().gte(0),
    expected_take_rate: z.union([z.number(), z.null()]).optional(),
    feature_set: z.union([z.number(), z.null()]).optional(),
    foundation_stake: z.string(),
    gossip_port: z.union([z.number(), z.null()]).optional(),
    has_last_epoch_stats: z.boolean(),
    identity: z.string(),
    incidents: z.array(IncidentRecord),
    inflation_rewards_collector: z.union([z.string(), z.null()]).optional(),
    inflation_rewards_collector_healthy: z
      .union([z.boolean(), z.null()])
      .optional(),
    inflation_rewards_collector_redirected: z
      .union([z.boolean(), z.null()])
      .optional(),
    inflation_rewards_collector_shared_count: z
      .union([z.number(), z.null()])
      .optional(),
    inflation_rewards_commission_bps: z
      .union([z.number(), z.null()])
      .optional(),
    inflation_rewards_commission_bps_is_v4: z
      .union([z.boolean(), z.null()])
      .optional(),
    info_icon_url: z.union([z.string(), z.null()]).optional(),
    info_keybase: z.union([z.string(), z.null()]).optional(),
    info_name: z.union([z.string(), z.null()]).optional(),
    info_url: z.union([z.string(), z.null()]).optional(),
    institutional_stake: z.string(),
    marinade_native_stake: z.string(),
    marinade_stake: z.string(),
    net_apy: z.union([z.number(), z.null()]).optional(),
    node_ip: z.union([z.string(), z.null()]).optional(),
    operator: z.union([z.string(), z.null()]).optional(),
    pending_delegator_rewards: z.union([z.string(), z.null()]).optional(),
    protected: z.boolean().optional(),
    pubsub_public: z.union([z.boolean(), z.null()]).optional(),
    rpc_public: z.union([z.boolean(), z.null()]).optional(),
    rugged_commission: z.boolean(),
    rugged_commission_info: z.array(RugInfo),
    rugged_commission_occurrences: z.number().int().gte(0),
    score: z.union([z.number(), z.null()]).optional(),
    self_stake: z.string(),
    shred_version: z.union([z.number(), z.null()]).optional(),
    stake_delta_30d: z.union([z.string(), z.null()]).optional(),
    stake_delta_7d: z.union([z.string(), z.null()]).optional(),
    start_date: z.union([z.string(), z.null()]).optional(),
    start_epoch: z.number().int().gte(0),
    superminority: z.boolean(),
    unique_delegators: z.union([z.number(), z.null()]).optional(),
    verified: z.boolean().optional(),
    version: z.union([z.string(), z.null()]).optional(),
    vote_account: z.string(),
    vote_reward_lamports: z.union([z.number(), z.null()]).optional(),
    warnings: z.array(ValidatorWarning),
  })
  .passthrough()
const ValidatorsAggregated: z.ZodType<ValidatorsAggregated> = z
  .object({
    avg_apy: z.union([z.number(), z.null()]).optional(),
    avg_marinade_score: z.union([z.number(), z.null()]).optional(),
    epoch: z.number().int().gte(0),
    epoch_start_date: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const ResponseValidators: z.ZodType<ResponseValidators> = z
  .object({
    bond_flags_updated_at: z.union([z.string(), z.null()]).optional(),
    current_epoch: z.union([z.number(), z.null()]).optional(),
    net_apy_updated_at: z.union([z.string(), z.null()]).optional(),
    operators: z.union([z.array(ValidatorGroupRecord), z.null()]).optional(),
    total_activated_stake: z.union([z.string(), z.null()]).optional(),
    total_count: z.number().int().gte(0),
    validators: z.array(ValidatorRecord),
    validators_aggregated: z.array(ValidatorsAggregated),
  })
  .passthrough()
const ValidatorBlockRewardsRecord: z.ZodType<ValidatorBlockRewardsRecord> = z
  .object({
    amount: z.string(),
    authorized_voter: z.string(),
    epoch: z.number().int().gte(0),
    identity_account: z.string(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseValidatorsBlockRewards: z.ZodType<ResponseValidatorsBlockRewards> =
  z.object({ validators: z.array(ValidatorBlockRewardsRecord) }).passthrough()
const ScoreBreakdown: z.ZodType<ScoreBreakdown> = z
  .object({
    component_ranks: z.array(z.number().int()),
    component_scores: z.array(z.number()),
    component_values: z.array(z.union([z.string(), z.null()])),
    component_weights: z.array(z.number()),
    components: z.array(z.string()),
    created_at: z.string().datetime({ offset: true }),
    eligible_stake_algo: z.boolean(),
    eligible_stake_mnde: z.boolean(),
    eligible_stake_msol: z.boolean(),
    eligible_stake_vemnde: z.boolean(),
    epoch: z.number().int(),
    min_score_eligible_algo: z.union([z.number(), z.null()]).optional(),
    msol_votes: z.number().int().gte(0),
    rank: z.number().int(),
    score: z.number(),
    scoring_run_id: z.number().int(),
    target_stake_algo: z.number().int().gte(0),
    target_stake_mnde: z.number().int().gte(0),
    target_stake_msol: z.number().int().gte(0),
    target_stake_vemnde: z.number().int().gte(0),
    ui_hints: z.array(z.string()),
    ui_id: z.string(),
    vemnde_votes: z.number().int().gte(0),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseScoreBreakdown: z.ZodType<ResponseScoreBreakdown> = z
  .object({ score_breakdown: ScoreBreakdown })
  .passthrough()
const ResponseScoreBreakdowns: z.ZodType<ResponseScoreBreakdowns> = z
  .object({ score_breakdowns: z.array(ScoreBreakdown) })
  .passthrough()
const ValidatorScoreRecord: z.ZodType<ValidatorScoreRecord> = z
  .object({
    component_ranks: z.array(z.number().int()),
    component_scores: z.array(z.number()),
    component_values: z.array(z.union([z.string(), z.null()])),
    created_at: z.string().datetime({ offset: true }),
    eligible_stake_algo: z.boolean(),
    eligible_stake_msol: z.boolean(),
    eligible_stake_vemnde: z.boolean(),
    msol_votes: z.number().int().gte(0),
    rank: z.number().int(),
    score: z.number(),
    scoring_run_id: z.number().int(),
    target_stake_algo: z.number().int().gte(0),
    target_stake_msol: z.number().int().gte(0),
    target_stake_vemnde: z.number().int().gte(0),
    ui_hints: z.array(z.string()),
    vemnde_votes: z.number().int().gte(0),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseScores: z.ZodType<ResponseScores> = z
  .object({ scores: z.array(ValidatorScoreRecord) })
  .passthrough()
const PerformanceRecord: z.ZodType<PerformanceRecord> = z
  .object({
    blocks_produced: z.number().int().gte(0),
    credits: z.union([z.number(), z.null()]).optional(),
    leader_slots: z.number().int().gte(0),
    skip_rate: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough()
const SettlementRecord: z.ZodType<SettlementRecord> = z
  .object({ amount: z.string(), meta: z.string(), reason: z.string() })
  .passthrough()
const EventEpochRecord: z.ZodType<EventEpochRecord> = z
  .object({
    downtime: z.union([z.number(), z.null()]).optional(),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.union([z.string(), z.null()]).optional(),
    performance: z.union([z.null(), PerformanceRecord]).optional(),
    settlements: z.array(SettlementRecord),
    uptime_pct: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough()
const ResponseEvents: z.ZodType<ResponseEvents> = z
  .object({ events: z.array(EventEpochRecord) })
  .passthrough()
const TakeRateRecord: z.ZodType<TakeRateRecord> = z
  .object({
    created_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.union([z.string(), z.null()]).optional(),
    epoch_start_at: z.union([z.string(), z.null()]).optional(),
    expected_take_rate: z.union([z.number(), z.null()]).optional(),
    realized_take_rate: z.number(),
  })
  .passthrough()
const ResponseTakeRates: z.ZodType<ResponseTakeRates> = z
  .object({ take_rates: z.array(TakeRateRecord) })
  .passthrough()
const UptimeRecord: z.ZodType<UptimeRecord> = z
  .object({
    end_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.string().datetime({ offset: true }),
    epoch_start_at: z.string().datetime({ offset: true }),
    start_at: z.string().datetime({ offset: true }),
    status: z.string(),
  })
  .passthrough()
const ResponseUptimes: z.ZodType<ResponseUptimes> = z
  .object({ uptimes: z.array(UptimeRecord) })
  .passthrough()
const VersionRecord: z.ZodType<VersionRecord> = z
  .object({
    client_id: z.union([z.number(), z.null()]).optional(),
    client_id_raw: z.union([z.string(), z.null()]).optional(),
    client_label: z.string(),
    client_lineage: z.union([z.string(), z.null()]).optional(),
    client_name: z.string(),
    client_vendor: z.union([z.string(), z.null()]).optional(),
    created_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    feature_set: z.union([z.number(), z.null()]).optional(),
    shred_version: z.union([z.number(), z.null()]).optional(),
    version: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const ResponseVersions: z.ZodType<ResponseVersions> = z
  .object({ versions: z.array(VersionRecord) })
  .passthrough()

export const schemas = {
  ResponseAdminWorkflowMetrics,
  ResponseAdminScoreUpload,
  BlockProductionDetail,
  VersionStakeShare,
  IncidentRecord,
  GroupIncidentRecord,
  GroupIncidents,
  ValidatorGroupRecord,
  ClientRelease,
  GroupShare,
  ValidatorClientGroupRecord,
  ValidatorGroupNode,
  ResponseClients,
  BlockProductionStats,
  ClientDiversityStats,
  ClientLineageStats,
  DCConcentrationStats,
  FeatureSetStats,
  ClusterStats,
  ResponseClusterStats,
  UnstakeHint,
  GlobalUnstakeHintRecord,
  ResponseGlobalUnstakeHints,
  JitoRecord,
  ResponseJito,
  JitoMevRecord,
  ResponseJitoMev,
  GroupLocation,
  ValidatorProviderGroupRecord,
  ResponseProviders,
  FeatureGateFloor,
  ReleaseRecord,
  SfdpFloor,
  ResponseReleases,
  ResponseReportScoring,
  Stake,
  ResponseReportStaking,
  ResponseRewards,
  StakeDelegationAuthorityRecord,
  ConfigStakes,
  ResponseConfig,
  UnstakeHintRecord,
  ResponseUnstakeHints,
  ValidatorEpochStats,
  RugInfo,
  ValidatorWarning,
  ValidatorRecord,
  ValidatorsAggregated,
  ResponseValidators,
  ValidatorBlockRewardsRecord,
  ResponseValidatorsBlockRewards,
  ScoreBreakdown,
  ResponseScoreBreakdown,
  ResponseScoreBreakdowns,
  ValidatorScoreRecord,
  ResponseScores,
  PerformanceRecord,
  SettlementRecord,
  EventEpochRecord,
  ResponseEvents,
  TakeRateRecord,
  ResponseTakeRates,
  UptimeRecord,
  ResponseUptimes,
  VersionRecord,
  ResponseVersions,
}

const endpoints = makeApi([
  {
    method: 'post',
    path: '/admin/metrics',
    alias: 'Push workflow metrics',
    requestFormat: 'json',
    parameters: [
      {
        name: 'job_scheduled',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'job_success',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'job_error',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'prepare_scoring_duration',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'apply_scoring_duration',
        type: 'Query',
        schema: z.number().int().optional(),
      },
    ],
    response: z.object({ message: z.string() }).passthrough(),
  },
  {
    method: 'post',
    path: '/admin/scores',
    alias: 'Upload score results',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epoch',
        type: 'Query',
        schema: z.number().int(),
      },
      {
        name: 'components',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'component_weights',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'ui_id',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: z
      .object({ rows_processed: z.number().int().gte(0) })
      .passthrough(),
  },
  {
    method: 'get',
    path: '/clients',
    alias: 'List clients',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'order_field',
        type: 'Query',
        schema: z
          .enum([
            'Name',
            'Stake',
            'StakeDelta7d',
            'StakeDelta30d',
            'ActivatingStake',
            'NetPendingStake',
            'Credits',
            'MarinadeScore',
            'Apy',
            'NetApy',
            'Commission',
            'Uptime',
            'TakeRate',
            'ExpectedTakeRate',
            'Validators',
            'DelegationRelationships',
            'Incidents',
          ])
          .optional(),
      },
      {
        name: 'order_direction',
        type: 'Query',
        schema: z.enum(['ASC', 'DESC']).optional(),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
    ],
    response: ResponseClients,
  },
  {
    method: 'get',
    path: '/cluster-stats',
    alias: 'Show cluster stats',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epochs',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
    ],
    response: ResponseClusterStats,
  },
  {
    method: 'get',
    path: '/docs',
    alias: 'Docs',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/global-unstake-hints',
    alias: 'List global unstake hints',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epoch',
        type: 'Query',
        schema: z.number().int().gte(0),
      },
    ],
    response: ResponseGlobalUnstakeHints,
  },
  {
    method: 'get',
    path: '/healthz',
    alias: 'Liveness',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/jito',
    alias: 'List last Jito Rewards Info',
    requestFormat: 'json',
    response: ResponseJito,
  },
  {
    method: 'get',
    path: '/mev',
    alias: 'List last Jito MEV Info',
    requestFormat: 'json',
    response: ResponseJitoMev,
  },
  {
    method: 'get',
    path: '/providers',
    alias: 'List providers',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'order_field',
        type: 'Query',
        schema: z
          .enum([
            'Name',
            'Stake',
            'StakeDelta7d',
            'StakeDelta30d',
            'ActivatingStake',
            'NetPendingStake',
            'Credits',
            'MarinadeScore',
            'Apy',
            'NetApy',
            'Commission',
            'Uptime',
            'TakeRate',
            'ExpectedTakeRate',
            'Validators',
            'DelegationRelationships',
            'Incidents',
          ])
          .optional(),
      },
      {
        name: 'order_direction',
        type: 'Query',
        schema: z.enum(['ASC', 'DESC']).optional(),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
    ],
    response: ResponseProviders,
  },
  {
    method: 'get',
    path: '/readyz',
    alias: 'Readiness',
    requestFormat: 'json',
    response: z.void(),
    errors: [
      {
        status: 503,
        description: `Cache warmup has not finished`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/releases',
    alias: 'List client releases',
    description: `Mainnet client releases and the two version floors, as three lists: what was published (&#x60;releases&#x60;), what the Solana Foundation Delegation Program required (&#x60;sfdp_floors&#x60;), and what the cluster&#x27;s feature gates required (&#x60;feature_gate_floors&#x60;).`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'client',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'since_epoch',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'order_direction',
        type: 'Query',
        schema: z.enum(['ASC', 'DESC']).optional(),
      },
    ],
    response: ResponseReleases,
    errors: [
      {
        status: 500,
        description: `Failed to fetch records`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/reports/scoring',
    alias: 'List scoring reports',
    requestFormat: 'json',
    response: z
      .object({ reports: z.object({}).partial().passthrough() })
      .passthrough(),
  },
  {
    method: 'get',
    path: '/reports/scoring/:report_id',
    alias: 'Show the scoring report',
    requestFormat: 'json',
    parameters: [
      {
        name: 'report_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/reports/staking',
    alias: 'Show planned stakes',
    requestFormat: 'json',
    response: ResponseReportStaking,
  },
  {
    method: 'get',
    path: '/rewards',
    alias: 'List rewards',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epochs',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
    ],
    response: ResponseRewards,
  },
  {
    method: 'get',
    path: '/static/config',
    alias: 'Show configuration of the API',
    requestFormat: 'json',
    response: ResponseConfig,
  },
  {
    method: 'get',
    path: '/static/glossary.md',
    alias: 'Glossary',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/unstake-hints',
    alias: 'List unstake hints',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epoch',
        type: 'Query',
        schema: z.number().int().gte(0),
      },
    ],
    response: ResponseUnstakeHints,
  },
  {
    method: 'get',
    path: '/validators',
    alias: 'List validators',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epochs',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'query',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query_from_date',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'query_vote_accounts',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query_identities',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'order_field',
        type: 'Query',
        schema: z
          .enum([
            'Name',
            'Stake',
            'StakeDelta7d',
            'StakeDelta30d',
            'ActivatingStake',
            'NetPendingStake',
            'Credits',
            'MarinadeScore',
            'Apy',
            'NetApy',
            'Commission',
            'Uptime',
            'TakeRate',
            'ExpectedTakeRate',
            'Validators',
            'DelegationRelationships',
            'Incidents',
          ])
          .optional(),
      },
      {
        name: 'order_direction',
        type: 'Query',
        schema: z.enum(['ASC', 'DESC']).optional(),
      },
      {
        name: 'query_superminority',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_score',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_marinade_stake',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_with_names',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_sfdp',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_incident_free',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_incident_types',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'min_incident_downtime_seconds',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'min_incident_missed_slots',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'min_incident_leader_slots',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'min_incident_sandwich_rate',
        type: 'Query',
        schema: z.number().optional(),
      },
      {
        name: 'incident_window_epochs',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'query_verified',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_protected',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_flagged',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'query_provider',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query_client',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query_block_engine',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'search_properties',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'with_operator_groups',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
    ],
    response: ResponseValidators,
  },
  {
    method: 'get',
    path: '/validators/:vote_account/events',
    alias: 'List per-epoch validator events',
    description: `Per-epoch performance, downtime and PSR settlement events for a validator. &#x60;settlements[].reason&#x60; / &#x60;.meta&#x60; are raw upstream JSON.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'vote_account',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'query_from_epoch',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'query_from_date',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
    ],
    response: ResponseEvents,
    errors: [
      {
        status: 400,
        description: `Invalid query params (query_from_epoch / query_from_date are mutually exclusive, or query_from_date is outside the recorded epoch range)`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `No validator found for the given vote account or identity`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Failed to fetch records`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/validators/:vote_account/take-rates',
    alias: 'List take rate history',
    description: `Take rate per epoch for a validator. Returns the whole stored history unless bounded by a query parameter. &#x60;epoch_start_at&#x60; and &#x60;epoch_end_at&#x60; are null for epochs whose boundaries are not recorded.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'vote_account',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'query_from_epoch',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'query_from_date',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
    ],
    response: ResponseTakeRates,
    errors: [
      {
        status: 400,
        description: `Both query parameters given, or query_from_date outside the recorded epoch range`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `No validator found for the given vote account or identity`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Failed to fetch records`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/validators/:vote_account/uptimes',
    alias: 'List uptimes',
    requestFormat: 'json',
    parameters: [
      {
        name: 'vote_account',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'query_from_date',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
    ],
    response: ResponseUptimes,
  },
  {
    method: 'get',
    path: '/validators/:vote_account/versions',
    alias: 'List versions of a validator',
    requestFormat: 'json',
    parameters: [
      {
        name: 'vote_account',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ResponseVersions,
  },
  {
    method: 'get',
    path: '/validators/block-rewards',
    alias: 'List last validators block rewards',
    requestFormat: 'json',
    response: ResponseValidatorsBlockRewards,
  },
  {
    method: 'get',
    path: '/validators/flat',
    alias: 'List aggregated validators',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epochs',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: 'last_epoch',
        type: 'Query',
        schema: z.number().int().gte(0),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/validators/score-breakdown',
    alias: 'Show last score breakdown for a validator',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_vote_account',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: ResponseScoreBreakdown,
  },
  {
    method: 'get',
    path: '/validators/score-breakdowns',
    alias: 'Show score breakdowns for a validator for a certain period of time',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_from_date',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'query_vote_account',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: ResponseScoreBreakdowns,
  },
  {
    method: 'get',
    path: '/validators/scores',
    alias: 'List last scores for all validators',
    requestFormat: 'json',
    response: ResponseScores,
  },
])

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}

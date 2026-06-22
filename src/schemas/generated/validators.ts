import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const job_scheduled = z.union([z.boolean(), z.null()])
const prepare_scoring_duration = z.union([z.number(), z.null()])
const ResponseAdminWorkflowMetrics = z
  .object({ message: z.string() })
  .passthrough()
const ResponseAdminScoreUpload = z
  .object({ rows_processed: z.number().int().gte(0) })
  .passthrough()
const BlockProductionStats = z
  .object({
    avg_skip_rate: z.number(),
    blocks_produced: z.number().int().gte(0),
    epoch: z.number().int().gte(0),
    leader_slots: z.number().int().gte(0),
  })
  .passthrough()
const DCConcentrationStats = z
  .object({
    dc_concentration_by_asn: z.record(z.number()),
    dc_concentration_by_aso: z.record(z.number()),
    dc_concentration_by_city: z.record(z.number()),
    dc_stake_by_asn: z.record(z.number().int().gte(0)),
    dc_stake_by_aso: z.record(z.number().int().gte(0)),
    dc_stake_by_city: z.record(z.number().int().gte(0)),
    epoch: z.number().int().gte(0),
    total_activated_stake: z.number().int().gte(0),
  })
  .passthrough()
const ClusterStats = z
  .object({
    block_production_stats: z.array(BlockProductionStats),
    dc_concentration_stats: z.array(DCConcentrationStats),
  })
  .passthrough()
const ResponseClusterStats = z
  .object({ cluster_stats: ClusterStats })
  .passthrough()
const UnstakeHint = z.enum([
  'HighCommission',
  'HighCommissionInPreviousEpoch',
  'Blacklist',
  'LowCredits',
])
const GlobalUnstakeHintRecord = z
  .object({ hints: z.array(UnstakeHint), vote_account: z.string() })
  .passthrough()
const ResponseGlobalUnstakeHints = z
  .object({ unstake_hints: z.array(GlobalUnstakeHintRecord) })
  .passthrough()
const JitoRecord = z
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
const ResponseJito = z.object({ validators: z.array(JitoRecord) }).passthrough()
const JitoMevRecord = z
  .object({
    epoch: z.string(),
    mev_commission_bps: z.number().int(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseJitoMev = z
  .object({ validators: z.array(JitoMevRecord) })
  .passthrough()
const Stake = z
  .object({
    current_stake: z.number().int().gte(0),
    identity: z.string(),
    next_stake: z.number().int().gte(0),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseReportStaking = z
  .object({ planned: z.array(Stake) })
  .passthrough()
const ResponseRewards = z
  .object({
    rewards_block: z.array(z.array(z.any())),
    rewards_inflation_est: z.array(z.array(z.any())),
    rewards_jito_priority: z.array(z.array(z.any())),
    rewards_mev: z.array(z.array(z.any())),
  })
  .passthrough()
const StakeDelegationAuthorityRecord = z
  .object({ delegation_authority: z.string(), name: z.string() })
  .passthrough()
const ConfigStakes = z
  .object({ delegation_authorities: z.array(StakeDelegationAuthorityRecord) })
  .passthrough()
const ResponseConfig = z.object({ stakes: ConfigStakes }).passthrough()
const UnstakeHintRecord = z
  .object({
    hints: z.array(UnstakeHint),
    marinade_stake: z.number(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseUnstakeHints = z
  .object({ unstake_hints: z.array(UnstakeHintRecord) })
  .passthrough()
const ValidatorEpochStats = z
  .object({
    activated_stake: z.string(),
    apr: z.union([z.number(), z.null()]).optional(),
    apy: z.union([z.number(), z.null()]).optional(),
    blocks_produced: z.number().int().gte(0),
    commission_advertised: z.union([z.number(), z.null()]).optional(),
    commission_effective: z.union([z.number(), z.null()]).optional(),
    commission_max_observed: z.union([z.number(), z.null()]).optional(),
    commission_min_observed: z.union([z.number(), z.null()]).optional(),
    credits: z.number().int().gte(0),
    downtime: z.union([z.number(), z.null()]).optional(),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.union([z.string(), z.null()]).optional(),
    epoch_start_at: z.union([z.string(), z.null()]).optional(),
    foundation_stake: z.string(),
    institutional_stake: z.string(),
    leader_slots: z.number().int().gte(0),
    marinade_native_stake: z.string(),
    marinade_stake: z.string(),
    rank_activated_stake: z.union([z.number(), z.null()]).optional(),
    rank_apy: z.union([z.number(), z.null()]).optional(),
    rank_score: z.union([z.number(), z.null()]).optional(),
    score: z.union([z.number(), z.null()]).optional(),
    self_stake: z.string(),
    skip_rate: z.number(),
    stake_to_become_superminority: z.string(),
    superminority: z.boolean(),
    uptime: z.union([z.number(), z.null()]).optional(),
    uptime_pct: z.union([z.number(), z.null()]).optional(),
    version: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const RugInfo = z
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
const ValidatorRecord = z
  .object({
    activated_stake: z.string(),
    avg_apy: z.union([z.number(), z.null()]).optional(),
    avg_uptime_pct: z.union([z.number(), z.null()]).optional(),
    commission_advertised: z.union([z.number(), z.null()]).optional(),
    commission_aggregated: z.union([z.number(), z.null()]).optional(),
    commission_effective: z.union([z.number(), z.null()]).optional(),
    commission_max_observed: z.union([z.number(), z.null()]).optional(),
    commission_min_observed: z.union([z.number(), z.null()]).optional(),
    credits: z.number().int().gte(0),
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
    dcc_full_city: z.union([z.number(), z.null()]).optional(),
    epoch_stats: z.array(ValidatorEpochStats),
    epochs_count: z.number().int().gte(0),
    foundation_stake: z.string(),
    has_last_epoch_stats: z.boolean(),
    identity: z.string(),
    info_icon_url: z.union([z.string(), z.null()]).optional(),
    info_keybase: z.union([z.string(), z.null()]).optional(),
    info_name: z.union([z.string(), z.null()]).optional(),
    info_url: z.union([z.string(), z.null()]).optional(),
    institutional_stake: z.string(),
    marinade_native_stake: z.string(),
    marinade_stake: z.string(),
    node_ip: z.union([z.string(), z.null()]).optional(),
    rugged_commission: z.boolean(),
    rugged_commission_info: z.array(RugInfo),
    rugged_commission_occurrences: z.number().int().gte(0),
    score: z.union([z.number(), z.null()]).optional(),
    self_stake: z.string(),
    start_date: z.union([z.string(), z.null()]).optional(),
    start_epoch: z.number().int().gte(0),
    superminority: z.boolean(),
    version: z.union([z.string(), z.null()]).optional(),
    vote_account: z.string(),
    warnings: z.array(ValidatorWarning),
  })
  .passthrough()
const ValidatorsAggregated = z
  .object({
    avg_apy: z.union([z.number(), z.null()]).optional(),
    avg_marinade_score: z.union([z.number(), z.null()]).optional(),
    epoch: z.number().int().gte(0),
    epoch_start_date: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const ResponseValidators = z
  .object({
    validators: z.array(ValidatorRecord),
    validators_aggregated: z.array(ValidatorsAggregated),
  })
  .passthrough()
const ValidatorBlockRewardsRecord = z
  .object({
    amount: z.string(),
    authorized_voter: z.string(),
    epoch: z.number().int().gte(0),
    identity_account: z.string(),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseValidatorsBlockRewards = z
  .object({ validators: z.array(ValidatorBlockRewardsRecord) })
  .passthrough()
const ScoreBreakdown = z
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
const ResponseScoreBreakdown = z
  .object({ score_breakdown: ScoreBreakdown })
  .passthrough()
const query_from_date = z.union([z.string(), z.null()])
const ResponseScoreBreakdowns = z
  .object({ score_breakdowns: z.array(ScoreBreakdown) })
  .passthrough()
const ValidatorScoreRecord = z
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
const ResponseScores = z
  .object({ scores: z.array(ValidatorScoreRecord) })
  .passthrough()
const CommissionRecord = z
  .object({
    commission: z.number().int().gte(0),
    created_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.string().datetime({ offset: true }),
    epoch_slot: z.number().int().gte(0),
    epoch_start_at: z.string().datetime({ offset: true }),
  })
  .passthrough()
const ResponseCommissions = z
  .object({ commissions: z.array(CommissionRecord) })
  .passthrough()
const UptimeRecord = z
  .object({
    end_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    epoch_end_at: z.string().datetime({ offset: true }),
    epoch_start_at: z.string().datetime({ offset: true }),
    start_at: z.string().datetime({ offset: true }),
    status: z.string(),
  })
  .passthrough()
const ResponseUptimes = z
  .object({ uptimes: z.array(UptimeRecord) })
  .passthrough()
const VersionRecord = z
  .object({
    created_at: z.string().datetime({ offset: true }),
    epoch: z.number().int().gte(0),
    version: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough()
const ResponseVersions = z
  .object({ versions: z.array(VersionRecord) })
  .passthrough()
const CommissionChange = z
  .object({
    epoch: z.number().int().gte(0),
    epoch_slot: z.number().int().gte(0),
    from: z.number().int().gte(0),
    to: z.number().int().gte(0),
    vote_account: z.string(),
  })
  .passthrough()
const ResponseCommissionChanges = z
  .object({ commission_changes: z.array(CommissionChange) })
  .passthrough()
const ResponseReportScoring = z
  .object({ reports: z.object({}).partial().passthrough() })
  .passthrough()

export const schemas = {
  job_scheduled,
  prepare_scoring_duration,
  ResponseAdminWorkflowMetrics,
  ResponseAdminScoreUpload,
  BlockProductionStats,
  DCConcentrationStats,
  ClusterStats,
  ResponseClusterStats,
  UnstakeHint,
  GlobalUnstakeHintRecord,
  ResponseGlobalUnstakeHints,
  JitoRecord,
  ResponseJito,
  JitoMevRecord,
  ResponseJitoMev,
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
  query_from_date,
  ResponseScoreBreakdowns,
  ValidatorScoreRecord,
  ResponseScores,
  CommissionRecord,
  ResponseCommissions,
  UptimeRecord,
  ResponseUptimes,
  VersionRecord,
  ResponseVersions,
  CommissionChange,
  ResponseCommissionChanges,
  ResponseReportScoring,
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
        type: 'Path',
        schema: job_scheduled,
      },
      {
        name: 'job_success',
        type: 'Path',
        schema: job_scheduled,
      },
      {
        name: 'job_error',
        type: 'Path',
        schema: job_scheduled,
      },
      {
        name: 'prepare_scoring_duration',
        type: 'Path',
        schema: prepare_scoring_duration,
      },
      {
        name: 'apply_scoring_duration',
        type: 'Path',
        schema: prepare_scoring_duration,
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
        type: 'Path',
        schema: z.number().int(),
      },
      {
        name: 'components',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'component_weights',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'ui_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z
      .object({ rows_processed: z.number().int().gte(0) })
      .passthrough(),
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
        type: 'Path',
        schema: z.number().int().gte(0),
      },
    ],
    response: ResponseGlobalUnstakeHints,
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
        type: 'Path',
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
            'Stake',
            'Credits',
            'MarinadeScore',
            'Apy',
            'Commission',
            'Uptime',
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
    path: '/validators/:vote_account/commissions',
    alias: 'List commission changes',
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
    response: ResponseCommissions,
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
        type: 'Path',
        schema: prepare_scoring_duration,
      },
      {
        name: 'last_epoch',
        type: 'Path',
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
        type: 'Path',
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
        type: 'Path',
        schema: query_from_date,
      },
      {
        name: 'query_vote_account',
        type: 'Path',
        schema: query_from_date,
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
  {
    method: 'get',
    path: 'reports/commission-changes',
    alias: 'List commission change reports',
    requestFormat: 'json',
    response: ResponseCommissionChanges,
  },
  {
    method: 'get',
    path: 'reports/scoring',
    alias: 'List scoring reports',
    requestFormat: 'json',
    response: z
      .object({ reports: z.object({}).partial().passthrough() })
      .passthrough(),
  },
])

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}

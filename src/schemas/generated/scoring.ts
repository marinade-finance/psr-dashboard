import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const ValidatorStakeSummaryDto = z
  .object({
    validatorVoteAccount: z.string(),
    totalAmountStakedLamports: z.number(),
    totalStakeDeltaLamports: z.number(),
    operationsCount: z.number(),
    successfulOperations: z.number(),
    failedOperations: z.number(),
  })
  .passthrough()
const StakeEpochSummaryDto = z
  .object({
    fromEpoch: z.number(),
    toEpoch: z.number(),
    lastReportTimestampUnix: z.number(),
    totalStakeDeltaLamports: z.number(),
    totalStakedLamports: z.number(),
    reserveBalanceBeforeLamports: z.number(),
    totalReportRuns: z.number(),
    totalTransactionsProcessed: z.number(),
    totalTransactionsOk: z.number(),
    totalTransactionsErr: z.number(),
    validators: z.array(ValidatorStakeSummaryDto),
  })
  .passthrough()
const ValidatorUnstakeSummaryDto = z
  .object({
    validatorVoteAccount: z.string(),
    totalAmountUnstakedLamports: z.number(),
    operationsCount: z.number(),
    successfulOperations: z.number(),
    failedOperations: z.number(),
  })
  .passthrough()
const UnstakeEpochSummaryDto = z
  .object({
    fromEpoch: z.number(),
    toEpoch: z.number(),
    reportType: z
      .enum(['partial-unstake', 'delayed-unstake-tickets'])
      .optional(),
    lastReportTimestampUnix: z.number(),
    totalOverstakeLamports: z.number(),
    totalUnstakedLamports: z.number(),
    totalUnstakeBudgetLamports: z.number(),
    maxPartialUnstakeCoolingDownRatio: z.number().optional(),
    maxPartialUnstakeCoolingDownLamports: z.number().optional(),
    partialUnstakeCoolingDownBeforeLamports: z.number().optional(),
    totalReportRuns: z.number(),
    totalTransactionsProcessed: z.number(),
    totalTransactionsOk: z.number(),
    totalTransactionsErr: z.number(),
    validators: z.array(ValidatorUnstakeSummaryDto),
  })
  .passthrough()
const CombinedEpochSummaryDto = z
  .object({
    fromEpoch: z.number(),
    toEpoch: z.number(),
    stakes: StakeEpochSummaryDto.nullable(),
    unstakes: UnstakeEpochSummaryDto.nullable(),
  })
  .passthrough()

export const schemas = {
  ValidatorStakeSummaryDto,
  StakeEpochSummaryDto,
  ValidatorUnstakeSummaryDto,
  UnstakeEpochSummaryDto,
  CombinedEpochSummaryDto,
}

const endpoints = makeApi([
  {
    method: 'get',
    path: '/api/v1/reports/summary',
    alias: 'ReportsController_getCombinedEpochSummary',
    requestFormat: 'json',
    parameters: [
      {
        name: 'fromEpoch',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'toEpoch',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'unstakeReportType',
        type: 'Query',
        schema: z
          .enum(['partial-unstake', 'delayed-unstake-tickets'])
          .optional(),
      },
    ],
    response: CombinedEpochSummaryDto,
  },
  {
    method: 'get',
    path: '/api/v1/scores/breakdowns',
    alias: 'ScoresController_getScoreBreakdowns',
    requestFormat: 'json',
    parameters: [
      {
        name: 'startDate',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'voteAccount',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'epoch',
        type: 'Query',
        schema: z.number(),
      },
      {
        name: 'lastEpochs',
        type: 'Query',
        schema: z.number(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/api/v1/scores/breakdowns/last',
    alias: 'ScoresController_getLastScoreBreakdowns',
    requestFormat: 'json',
    parameters: [
      {
        name: 'voteAccount',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/api/v1/scores/sam',
    alias: 'ScoresController_getSamScores',
    requestFormat: 'json',
    parameters: [
      {
        name: 'voteAccount',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'epoch',
        type: 'Query',
        schema: z.number(),
      },
      {
        name: 'lastEpochs',
        type: 'Query',
        schema: z.number(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'get',
    path: '/api/v1/scores/sam/last',
    alias: 'ScoresController_getLastSamScores',
    requestFormat: 'json',
    parameters: [
      {
        name: 'voteAccount',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: 'post',
    path: '/api/v1/scores/sam/upload',
    alias: 'ScoresController_samUpload',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'post',
    path: '/api/v1/scores/upload',
    alias: 'ScoresController_upload',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/api/v1/stakes',
    alias: 'StakesController_getPlannedStakes',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'post',
    path: '/api/v1/stakes/report/upload/liquid',
    alias: 'StakesController_uploadLiquidReport',
    requestFormat: 'json',
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Invalid file format or validation error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'post',
    path: '/api/v1/unstakes/report/upload/liquid',
    alias: 'UnstakesController_uploadLiquidReport',
    requestFormat: 'json',
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Invalid file format or validation error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/api/v1/unstakes/unstake-hints',
    alias: 'UnstakesController_getUnstakeHints',
    requestFormat: 'json',
    parameters: [
      {
        name: 'epoch',
        type: 'Query',
        schema: z.unknown(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: 'post',
    path: '/api/v1/unstakes/update',
    alias: 'UnstakesController_upload',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/health',
    alias: 'HealthController_check',
    requestFormat: 'json',
    response: z.void(),
  },
  {
    method: 'get',
    path: '/metrics',
    alias: 'PrometheusController_index',
    requestFormat: 'json',
    response: z.void(),
  },
])

export const api = new Zodios(endpoints)

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}

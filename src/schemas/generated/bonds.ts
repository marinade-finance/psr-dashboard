import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const ValidatorBondRecord = z
  .object({
    authority: z.string(),
    block_commission_bps: z.number().int().nullish(),
    bond_type: z.string(),
    cpmpe: z.string(),
    effective_amount: z.number(),
    epoch: z.number().int().gte(0),
    funded_amount: z.number(),
    inflation_commission_bps: z.number().int().nullish(),
    max_stake_wanted: z.number(),
    mev_commission_bps: z.number().int().nullish(),
    pubkey: z.string(),
    remaining_witdraw_request_amount: z.number(),
    remainining_settlement_claim_amount: z.number(),
    updated_at: z.string(),
    vote_account: z.string(),
  })
  .passthrough()
const BondsResponse = z
  .object({ bonds: z.array(ValidatorBondRecord) })
  .passthrough()
const SettlementFunder = z.enum(['ValidatorBond', 'Marinade'])
const SettlementMeta = z.object({ funder: SettlementFunder }).passthrough()
const Pubkey = z.string()
const ProtectedEvent = z.union([
  z
    .object({
      DowntimeRevenueImpact: z
        .object({
          actual_credits: z.number().int().gte(0),
          actual_epr: z.string(),
          epr_loss_bps: z.number().int().gte(0),
          expected_credits: z.number().int().gte(0),
          expected_epr: z.string(),
          stake: z.number().int().gte(0),
          vote_account: Pubkey,
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      CommissionSamIncrease: z
        .object({
          actual_epr: z.string(),
          actual_inflation_commission: z.string(),
          actual_mev_commission: z.string().nullish(),
          before_sam_commission_increase_pmpe: z.string(),
          epr_loss_bps: z.number().int().gte(0),
          expected_epr: z.string(),
          expected_inflation_commission: z.string(),
          expected_mev_commission: z.string().nullish(),
          past_inflation_commission: z.string(),
          past_mev_commission: z.string().nullish(),
          stake: z.number().int().gte(0),
          vote_account: Pubkey,
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      CommissionIncrease: z
        .object({
          actual_epr: z.string(),
          current_commission: z.number().int().gte(0),
          epr_loss_bps: z.number().int().gte(0),
          expected_epr: z.string(),
          previous_commission: z.number().int().gte(0),
          stake: z.string(),
          vote_account: Pubkey,
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      LowCredits: z
        .object({
          actual_credits: z.number().int().gte(0),
          actual_epr: z.string(),
          commission: z.number().int().gte(0),
          epr_loss_bps: z.number().int().gte(0),
          expected_credits: z.number().int().gte(0),
          expected_epr: z.string(),
          stake: z.string(),
          vote_account: Pubkey,
        })
        .passthrough(),
    })
    .passthrough(),
  z.object({}).passthrough(),
])
const SettlementReason = z.union([
  z.object({ ProtectedEvent: ProtectedEvent }).passthrough(),
  z.literal('Bidding'),
  z.literal('PriorityFee'),
  z.literal('BidTooLowPenalty'),
  z.literal('BlacklistPenalty'),
  z.literal('BondRiskFee'),
  z.literal('InstitutionalPayout'),
])
const ProtectedEventRecord = z
  .object({
    amount: z.number().int().gte(0),
    epoch: z.number().int().gte(0),
    meta: SettlementMeta,
    reason: SettlementReason,
    vote_account: Pubkey,
  })
  .passthrough()
const ProtectedEventsResponse = z
  .object({ protected_events: z.array(ProtectedEventRecord) })
  .passthrough()
const CliType = z.enum(['sam', 'institutional'])
const type = CliType.nullish()

export const schemas = {
  ValidatorBondRecord,
  BondsResponse,
  SettlementFunder,
  SettlementMeta,
  Pubkey,
  ProtectedEvent,
  SettlementReason,
  ProtectedEventRecord,
  ProtectedEventsResponse,
  CliType,
  type,
}

const endpoints = makeApi([
  {
    method: 'get',
    path: '/bonds/bidding',
    alias: 'List bidding validator bonds',
    requestFormat: 'json',
    response: BondsResponse,
  },
  {
    method: 'get',
    path: '/bonds/institutional',
    alias: 'List institutional validator bonds',
    requestFormat: 'json',
    response: BondsResponse,
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
    path: '/protected-events',
    alias: 'List Bid PSR (protected events)',
    requestFormat: 'json',
    response: ProtectedEventsResponse,
  },
  {
    method: 'post',
    path: '/v1/cli-usage',
    alias: 'Record CLI invocation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'account',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'operation',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'cli_version',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'type',
        type: 'Query',
        schema: type,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Invalid input (field too long)`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
])

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}

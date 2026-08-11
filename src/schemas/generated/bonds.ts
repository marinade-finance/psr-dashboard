import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const ValidatorBondRecord = z
  .object({
    authority: z.string(),
    block_commission_bps: z.number().int().nullish(),
    bond_type: z.string(),
    cpmpe: z.number(),
    effective_amount: z.number(),
    epoch: z.number().int().gte(0),
    funded_amount: z.number(),
    inflation_commission_bps: z.number().int().nullish(),
    max_stake_wanted: z.number(),
    mev_commission_bps: z.number().int().nullish(),
    pubkey: z.string(),
    remaining_witdraw_request_amount: z.number(),
    remainining_settlement_claim_amount: z.number(),
    updated_at: z.string().datetime({ offset: true }),
    vote_account: z.string(),
  })
  .passthrough()
const BondsResponse = z
  .object({ bonds: z.array(ValidatorBondRecord) })
  .passthrough()
const AuctionContextResponse = z
  .object({
    auction_meta: z.unknown().nullish(),
    auction_validators: z.object({}).partial().passthrough(),
  })
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
          actual_epr: z.number(),
          epr_loss_bps: z.number().int().gte(0),
          expected_credits: z.number().int().gte(0),
          expected_epr: z.number(),
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
          actual_epr: z.number(),
          actual_inflation_commission: z.number(),
          actual_mev_commission: z.number().nullish(),
          before_sam_commission_increase_pmpe: z.number(),
          epr_loss_bps: z.number().int().gte(0),
          expected_epr: z.number(),
          expected_inflation_commission: z.number(),
          expected_mev_commission: z.number().nullish(),
          past_inflation_commission: z.number(),
          past_mev_commission: z.number().nullish(),
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
          actual_epr: z.number(),
          current_commission: z.number().int().gte(0),
          epr_loss_bps: z.number().int().gte(0),
          expected_epr: z.number(),
          previous_commission: z.number().int().gte(0),
          stake: z.number(),
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
          actual_epr: z.number(),
          commission: z.number().int().gte(0),
          epr_loss_bps: z.number().int().gte(0),
          expected_credits: z.number().int().gte(0),
          expected_epr: z.number(),
          stake: z.number(),
          vote_account: Pubkey,
        })
        .passthrough(),
    })
    .passthrough(),
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
    bond_type: z.string(),
    epoch: z.number().int().gte(0),
    meta: SettlementMeta,
    product: z.string(),
    reason: SettlementReason,
    vote_account: Pubkey,
  })
  .passthrough()
const ProtectedEventsResponse = z
  .object({ protected_events: z.array(ProtectedEventRecord) })
  .passthrough()
const ProtectedValidatorsResponse = z
  .object({ protected_validators: z.array(Pubkey) })
  .passthrough()
const AuthorityTotal = z
  .object({
    activating: z.number().int().gte(0),
    deactivating: z.number().int().gte(0),
    effective: z.number().int().gte(0),
    label: z.string(),
    stake_accounts: z.number().int().gte(0),
    stake_authority: Pubkey,
    validators: z.number().int().gte(0),
  })
  .passthrough()
const AuthorityStake = z
  .object({
    activating: z.number().int().gte(0),
    deactivating: z.number().int().gte(0),
    effective: z.number().int().gte(0),
    label: z.string(),
    stake_accounts: z.number().int().gte(0),
    stake_authority: Pubkey,
  })
  .passthrough()
const ValidatorStake = z
  .object({
    effective: z.number().int().gte(0),
    stake: z.array(AuthorityStake),
    vote_account: Pubkey,
  })
  .passthrough()
const CollectedStakeResponse = z
  .object({
    epoch: z.number().int().gte(0),
    slot: z.number().int().gte(0),
    totals: z.array(AuthorityTotal),
    updated_at: z.string().datetime({ offset: true }),
    validators: z.array(ValidatorStake),
  })
  .passthrough()
const VerifiedValidatorsResponse = z
  .object({ verified_validators: z.array(Pubkey) })
  .passthrough()

export const schemas = {
  ValidatorBondRecord,
  BondsResponse,
  AuctionContextResponse,
  SettlementFunder,
  SettlementMeta,
  Pubkey,
  ProtectedEvent,
  SettlementReason,
  ProtectedEventRecord,
  ProtectedEventsResponse,
  ProtectedValidatorsResponse,
  AuthorityTotal,
  AuthorityStake,
  ValidatorStake,
  CollectedStakeResponse,
  VerifiedValidatorsResponse,
}

const endpoints = makeApi([
  {
    method: 'get',
    path: '/bonds/bidding',
    alias: 'List bidding validator bonds',
    requestFormat: 'json',
    response: BondsResponse,
    errors: [
      {
        status: 500,
        description: `Bonds could not be read from the database.`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/bonds/bidding/auction',
    alias: 'Auction context for bidding validator bonds',
    requestFormat: 'json',
    response: z
      .object({
        auction_meta: z.unknown().nullish(),
        auction_validators: z.object({}).partial().passthrough(),
      })
      .passthrough(),
  },
  {
    method: 'get',
    path: '/bonds/institutional',
    alias: 'List institutional validator bonds',
    requestFormat: 'json',
    response: BondsResponse,
    errors: [
      {
        status: 500,
        description: `Bonds could not be read from the database.`,
        schema: z.void(),
      },
    ],
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
    path: '/v1/protected-events',
    alias: 'List PSR (protected events) per bond type and product',
    requestFormat: 'json',
    response: ProtectedEventsResponse,
    errors: [
      {
        status: 500,
        description: `No settlements have been read from BigQuery yet. Deliberately not an empty list, which would read as &#x27;no validator owes a protected event&#x27;.`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/v1/validators/protected',
    alias: 'List validators whose stakers are PSR protected',
    requestFormat: 'json',
    response: ProtectedValidatorsResponse,
    errors: [
      {
        status: 500,
        description: `No stake has been collected yet, or bonds could not be read. Deliberately not an empty list, which would read as &#x27;no validator is protected&#x27;.`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/v1/validators/stake',
    alias: 'Marinade stake per validator, per staker authority',
    requestFormat: 'json',
    response: CollectedStakeResponse,
    errors: [
      {
        status: 500,
        description: `No stake has been collected yet, or it could not be read. Deliberately not an empty list, which would read as &#x27;no validator has stake&#x27;.`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/v1/validators/verified',
    alias: 'List verified validators',
    requestFormat: 'json',
    response: VerifiedValidatorsResponse,
  },
])

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}

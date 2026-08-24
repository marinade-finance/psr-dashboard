import { z } from 'zod'

import { lamportsToSol } from 'src/format'
import { schemas } from 'src/schemas/generated/bonds'
import { VALIDATOR_BONDS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

// Override layer over the generated schema: the spec declares bond_type required, but the live
// API may omit it. cpmpe stays a union because the spec has declared it both ways across regens.
// updated_at stays a plain string: nothing reads it, so enforcing the spec's date-time format
// would only add a way for one odd timestamp to fail the whole bonds table.
// Applying the loosening here (not in the generated file) keeps `pnpm generate` faithful — a
// regen can't silently revert these and re-break /bonds. See bugs.md #42.
const BondRecordSchema = schemas.ValidatorBondRecord.extend({
  cpmpe: z.union([z.string(), z.number()]),
  bond_type: z.string().optional(),
  updated_at: z.string(),
})
const BondsResponseSchema = z
  .object({ bonds: z.array(BondRecordSchema) })
  .passthrough()

export type BondRecord = {
  pubkey: string
  vote_account: string
  authority: string
  cpmpe: string
  updated_at: string
  epoch: number
  funded_amount: number
  effective_amount: number
  max_stake_wanted: number
  remaining_witdraw_request_amount: number
  remainining_settlement_claim_amount: number
  inflation_commission_bps?: number
  mev_commission_bps?: number
  block_commission_bps?: number
}

export const selectEffectiveAmount = (bond: BondRecord) =>
  Number(lamportsToSol(bond.effective_amount.toString()))

type BondsResponse = {
  bonds: BondRecord[]
}

export const fetchBonds = (signal?: AbortSignal): Promise<BondsResponse> =>
  fetchJson<BondsResponse>(
    `${VALIDATOR_BONDS_API_URL}/bonds`,
    signal,
    body => BondsResponseSchema.parse(body) as BondsResponse,
  )

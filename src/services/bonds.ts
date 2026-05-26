import { lamportsToSol } from 'src/format'
import { VALIDATOR_BONDS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

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
  fetchJson<BondsResponse>(`${VALIDATOR_BONDS_API_URL}/bonds`, signal)

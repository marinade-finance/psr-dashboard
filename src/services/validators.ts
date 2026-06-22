import { lamportsToSol } from 'src/format'
import { schemas } from 'src/schemas/generated/validators'
import { VALIDATORS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

export type ValidatorEpoch = {
  credits: number
  marinade_stake: string
  marinade_native_stake: string
  activated_stake: string
  commission_advertised: number
  epoch: number
  epoch_start_at: string | null
  epoch_end_at: string | null
}

export type Validator = {
  vote_account: string
  info_name: string | null
  dc_country_iso: string | null
  marinade_stake: string
  marinade_native_stake: string
  activated_stake: string
  epoch_stats: ValidatorEpoch[]
}

// SOL-valued selectors return the full precision lamports → SOL gives.
// Rounding belongs at the formatter, never at the source — see CLAUDE.md.
export const selectTotalMarinadeStake = (validator: Validator) =>
  selectLiquidMarinadeStake(validator) + selectNativeMarinadeStake(validator)
export const selectLiquidMarinadeStake = (validator: Validator) =>
  Number(lamportsToSol(validator.marinade_stake))
export const selectNativeMarinadeStake = (validator: Validator) =>
  Number(lamportsToSol(validator.marinade_native_stake))

export const selectVoteAccount = (validator: Validator) =>
  validator.vote_account

export const selectName = (validator: Validator) => validator.info_name ?? '---'

type ValidatorsResponse = {
  validators: Validator[]
}

export const fetchValidatorsWithEpochs = (
  epochs: number,
  signal?: AbortSignal,
): Promise<ValidatorsResponse> =>
  fetchJson<ValidatorsResponse>(
    `${VALIDATORS_API_URL}/validators?limit=9999&epochs=${epochs}`,
    signal,
    body =>
      schemas.ResponseValidators.parse(body) as unknown as ValidatorsResponse,
  )

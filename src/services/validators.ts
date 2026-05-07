import { lamportsToSol } from 'src/format'
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

export const selectTotalMarinadeStake = (validator: Validator) =>
  Math.round(
    selectLiquidMarinadeStake(validator) + selectNativeMarinadeStake(validator),
  )
export const selectLiquidMarinadeStake = (validator: Validator) =>
  Math.round(Number(lamportsToSol(validator.marinade_stake)))
export const selectNativeMarinadeStake = (validator: Validator) =>
  Math.round(Number(lamportsToSol(validator.marinade_native_stake)))

export const selectVoteAccount = (validator: Validator) =>
  validator.vote_account

export const selectName = (validator: Validator) => validator.info_name ?? '---'

export type ValidatorsResponse = {
  validators: Validator[]
}

const cache = new Map<number, Promise<ValidatorsResponse>>()

export const fetchValidatorsWithEpochs = (
  epochs: number,
): Promise<ValidatorsResponse> => {
  const cached = cache.get(epochs)
  if (cached !== undefined) return cached
  const promise = fetchJson<ValidatorsResponse>(
    `${VALIDATORS_API_URL}/validators?limit=9999&epochs=${epochs}`,
  ).then(data => ({
    validators: data.validators.filter(
      v => Number(v.marinade_stake) > 0 || Number(v.marinade_native_stake) > 0,
    ),
  }))
  cache.set(epochs, promise)
  promise.catch(() => cache.delete(epochs))
  return promise
}

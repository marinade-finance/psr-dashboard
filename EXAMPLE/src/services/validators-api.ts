export type ApiValidatorEpochStats = {
  credits: number
  marinade_stake: string
  marinade_native_stake: string
  activated_stake: string
  commission_advertised: number
  epoch: number
  epoch_start_at: string | null
  epoch_end_at: string | null
}

export type ApiValidator = {
  vote_account: string
  info_name: string | null
  commission_advertised: number
  marinade_stake: string
  marinade_native_stake: string
  institutional_stake: string
  activated_stake: string
  epoch_stats: ApiValidatorEpochStats[]
}

export type ApiValidatorsResponse = {
  validators: ApiValidator[]
}

export type ApiApyLabel = {
  lowerTime: number
  upperTime: number
  lowerPrice: number
  upperPrice: number
}

export type ApiApy = {
  times: number[]
  values: number[]
  labels: ApiApyLabel[]
}

export const fetchApiValidators = async (): Promise<ApiValidatorsResponse> =>
  fetchApiValidatorsWithEpochs(0)

export const fetchApiValidatorsWithEpochs = async (
  epochs: number,
): Promise<ApiValidatorsResponse> => {
  const res = await fetch(
    `https://validators-api.marinade.finance/validators?limit=9999&epochs=${epochs}`,
  )
  return (await res.json()) as ApiValidatorsResponse
}

export type MevRecord = {
  vote_account: string
  mev_commission_bps: number
  epoch: number
}

export type MevResponse = {
  validators: MevRecord[]
}

export const fetchJitoMevData = async (): Promise<MevResponse> => {
  const res = await fetch('https://validators-api.marinade.finance/jito')
  return (await res.json()) as MevResponse
}

export const fetchApiApy = async (): Promise<ApiApy> => {
  // https://github.com/marinade-finance/marinade-web/pull/3893
  const fromInUnix = Math.floor(Date.now() / 1000) - 168 * 60 * 60
  const nowInUnix = Math.floor(Date.now() / 1000)
  // Build API URL for marinade-select APY endpoint
  const url = new URL(
    'https://apy.marinade.finance/v1/rolling-apy/marinade-select',
  )
  url.searchParams.append('window', '1209600') // 14 days in seconds
  url.searchParams.append('from', fromInUnix.toString())
  url.searchParams.append('to', nowInUnix.toString())
  const res = await fetch(url)
  return (await res.json()) as ApiApy
}

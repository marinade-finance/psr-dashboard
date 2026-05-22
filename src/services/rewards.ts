import { VALIDATORS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

export type EpochRewards = [number, number]

export type RewardsResponse = {
  rewards_mev: EpochRewards[]
  rewards_inflation_est: EpochRewards[]
}

export const fetchRewards = (signal?: AbortSignal): Promise<RewardsResponse> =>
  fetchJson<RewardsResponse>(`${VALIDATORS_API_URL}/rewards`, signal)

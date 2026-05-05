import { VALIDATORS_API_URL } from 'src/services/apiUrls'

export type EpochRewards = [number, number]

export type RewardsResponse = {
  rewards_mev: EpochRewards[]
  rewards_inflation_est: EpochRewards[]
}

export const fetchRewards = async (): Promise<RewardsResponse> => {
  const res = await fetch(`${VALIDATORS_API_URL}/rewards`)
  return (await res.json()) as RewardsResponse
}

import { z } from 'zod'
import { VALIDATORS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

export type EpochRewards = [number, number]

type RewardsResponse = {
  rewards_mev: EpochRewards[]
  rewards_inflation_est: EpochRewards[]
}

const EpochRewardsTupleSchema = z
  .tuple([z.number(), z.number()])
  .rest(z.unknown())
const RewardsResponseSchema = z
  .object({
    rewards_mev: z.array(EpochRewardsTupleSchema),
    rewards_inflation_est: z.array(EpochRewardsTupleSchema),
  })
  .passthrough()

export const fetchRewards = (signal?: AbortSignal): Promise<RewardsResponse> =>
  fetchJson<RewardsResponse>(`${VALIDATORS_API_URL}/rewards`, signal, body =>
    RewardsResponseSchema.parse(body),
  )

import { z } from 'zod'
import { VALIDATORS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

// [epoch, rewards, ...] — the schema's .rest(z.unknown()) admits extra
// trailing elements the backend may append, so the type must too.
export type EpochRewards = [number, number, ...unknown[]]

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

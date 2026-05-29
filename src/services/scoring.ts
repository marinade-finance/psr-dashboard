import { z } from 'zod'
import { SCORING_API_URL } from './apiUrls'
import { fetchJson } from './fetch-utils'

export type ScoringValidator = {
  epoch: number
  voteAccount: string
  revShare: {
    bidTooLowPenaltyPmpe: number
    blacklistPenaltyPmpe: number
  }
  values: {
    bondRiskFeeSol: number
  }
}

const ScoringValidatorSchema = z
  .object({
    epoch: z.number(),
    voteAccount: z.string(),
    revShare: z
      .object({
        bidTooLowPenaltyPmpe: z.number(),
        blacklistPenaltyPmpe: z.number(),
      })
      .passthrough(),
    values: z.object({ bondRiskFeeSol: z.number() }).passthrough(),
  })
  .passthrough()
const ScoringResponseSchema = z.array(ScoringValidatorSchema)

export const fetchScoring = (
  signal?: AbortSignal,
): Promise<ScoringValidator[]> =>
  fetchJson<ScoringValidator[]>(
    `${SCORING_API_URL}/api/v1/scores/sam?lastEpochs=3`,
    signal,
    body => ScoringResponseSchema.parse(body),
  )

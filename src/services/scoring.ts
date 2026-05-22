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

export const fetchScoring = (
  signal?: AbortSignal,
): Promise<ScoringValidator[]> =>
  fetchJson<ScoringValidator[]>(
    `${SCORING_API_URL}/api/v1/scores/sam?lastEpochs=3`,
    signal,
  )

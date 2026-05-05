import { SCORING_API_URL } from './apiUrls'

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

export const fetchScoring = async (): Promise<ScoringValidator[]> => {
  const res = await fetch(`${SCORING_API_URL}/api/v1/scores/sam?lastEpochs=3`)
  return (await res.json()) as ScoringValidator[]
}

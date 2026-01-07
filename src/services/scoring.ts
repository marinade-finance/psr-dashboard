export type ScoringValidator = {
  epoch: number
  voteAccount: string
  revShare: {
    bidTooLowPenaltyPmpe: number
  }
}

export const fetchScoring = async (): Promise<ScoringValidator[]> => {
  const res = await fetch(
    'https://scoring.marinade.finance/api/v1/scores/sam?lastEpochs=3',
  )
  return (await res.json()) as ScoringValidator[]
}

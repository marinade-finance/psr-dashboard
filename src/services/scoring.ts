import { SCORING_API_URL } from './apiUrls'
import { expectArray, expectObject, fetchJson } from './fetch-utils'

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

// Spot-check the wire format at the boundary: a backend rename of `voteAccount`
// or `revShare` would throw a FetchError with context here instead of letting
// `undefined` cascade through pmpe math (→ NaN displayed values).
const validateScoring = (body: unknown): ScoringValidator[] => {
  const arr = expectArray(body, 'scoring response')
  if (arr.length > 0) {
    const first = expectObject(arr[0], 'scoring entry')
    if (typeof first['voteAccount'] !== 'string') {
      throw new Error('scoring entry missing `voteAccount`')
    }
    if (typeof first['epoch'] !== 'number') {
      throw new Error('scoring entry missing numeric `epoch`')
    }
    expectObject(first['revShare'], 'scoring revShare')
  }
  return arr as ScoringValidator[]
}

export const fetchScoring = (
  signal?: AbortSignal,
): Promise<ScoringValidator[]> =>
  fetchJson<ScoringValidator[]>(
    `${SCORING_API_URL}/api/v1/scores/sam?lastEpochs=3`,
    signal,
    validateScoring,
  )

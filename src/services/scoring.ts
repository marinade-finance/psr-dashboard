import { z } from 'zod'
import { SCORING_API_URL } from './apiUrls'
import { fetchJson } from './fetch-utils'

import type { SamScoreRow } from '@marinade.finance/ds-sam-estimator'

export type ScoringValidator = SamScoreRow & {
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
    marinadeSamTargetSol: z.number(),
    maxStakeWanted: z.number().nullable(),
    revShare: z
      .object({
        bidTooLowPenaltyPmpe: z.number(),
        blacklistPenaltyPmpe: z.number(),
        inflationPmpe: z.number(),
        mevPmpe: z.number(),
        totalPmpe: z.number(),
        auctionEffectiveBidPmpe: z.number(),
      })
      .passthrough(),
    values: z
      .object({
        bondRiskFeeSol: z.number(),
        commissions: z
          .object({
            inflationCommissionDec: z.number().nullable(),
            mevCommissionDec: z.number(),
            inflationCommissionOnchainDec: z.number().nullable(),
            inflationCommissionInBondDec: z.number().nullable(),
            mevCommissionOnchainDec: z.number().nullable(),
            mevCommissionInBondDec: z.number().nullable(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    metadata: z
      .object({ scoringId: z.string().optional() })
      .passthrough()
      .optional(),
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

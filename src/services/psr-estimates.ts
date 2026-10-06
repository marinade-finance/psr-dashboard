import {
  calculateProtectedEventEstimates,
  pastCommissionsFromScores,
  samRunFromScores,
} from '@marinade.finance/ds-sam-estimator'

import { PSR_SETTLEMENT_CONFIGS } from './constants'
import { selectNetworkEpoch } from './epoch'
import { loadSam } from './sam'
import { fetchScoring } from './scoring'
import { fetchValidatorsWithEpochs } from './validators'

import type {
  ProtectedEvent,
  PsrValidatorMeta,
} from '@marinade.finance/ds-sam-estimator'
import type { QueryClient } from '@tanstack/react-query'

export const loadPsrEstimates = async (
  qc: QueryClient,
  signal?: AbortSignal,
): Promise<ProtectedEvent[]> => {
  const [{ validators }, scoring, { auctionResult }] = await Promise.all([
    qc.ensureQueryData({
      queryKey: ['validators-with-epochs', 3],
      queryFn: ({ signal: s }) => fetchValidatorsWithEpochs(3, s),
    }),
    fetchScoring(signal),
    qc.ensureQueryData({ queryKey: ['sam'], queryFn: () => loadSam() }),
  ])

  const epoch = selectNetworkEpoch(validators)
  if (epoch === null) return []

  const validatorMetas: PsrValidatorMeta[] = []
  const marinadeStakeLamports = new Map<string, bigint>()
  for (const validator of validators) {
    const stat = validator.epoch_stats.find(s => s.epoch === epoch)
    if (!stat) continue
    validatorMetas.push({
      vote_account: validator.vote_account,
      // 100 keeps the stake in the network credits mean; the estimator never charges it
      commission: stat.commission_advertised ?? 100,
      stake: BigInt(stat.activated_stake),
      credits: BigInt(stat.credits),
    })
    marinadeStakeLamports.set(
      validator.vote_account,
      BigInt(stat.marinade_stake) + BigInt(stat.marinade_native_stake),
    )
  }

  const { auctionData } = auctionResult
  return calculateProtectedEventEstimates({
    epoch,
    validatorMetas,
    samRun: samRunFromScores(scoring, epoch),
    currentValidators: auctionData.validators,
    pastCommissions: pastCommissionsFromScores(scoring, epoch - 1),
    rewards: auctionData.rewards,
    marinadeStakeLamports,
    settlementConfigs: PSR_SETTLEMENT_CONFIGS,
  })
}

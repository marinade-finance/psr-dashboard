import { fetchProtectedEvents } from './protected-events'
import { calculateProtectedEventEstimates } from './protected-events-estimator'
import { loadSam } from './sam'
import { fetchScoring } from './scoring'
import { fetchValidatorsWithEpochs } from './validators'

import type { ProtectedEvent } from './protected-events'
import type { Validator } from './validators'

export enum ProtectedEventStatus {
  DRYRUN,
  ESTIMATE,
  FACT,
}
export type ProtectedEventWithValidator = {
  status: ProtectedEventStatus
  protectedEvent: ProtectedEvent
  validator: Validator | null
}

const LAST_DRYRUN_EPOCH = 655

export const fetchProtectedEventsWithValidator = async (): Promise<
  ProtectedEventWithValidator[]
  // eslint-disable-next-line complexity
> => {
  const [
    { validators },
    { protected_events: protectedEvents },
    scoring,
    { auctionResult },
  ] = await Promise.all([
    fetchValidatorsWithEpochs(3),
    fetchProtectedEvents(),
    fetchScoring(),
    loadSam(),
  ])

  const estimatedProtectedEvents =
    await calculateProtectedEventEstimates(validators)

  const validatorsMap: Record<string, Validator> = {}
  for (const validator of validators) {
    validatorsMap[validator.vote_account] = validator
  }

  let latestProcessedEpoch = 0
  const protectedEventsWithValidator: ProtectedEventWithValidator[] = []
  for (const protectedEvent of protectedEvents) {
    latestProcessedEpoch = Math.max(protectedEvent.epoch, latestProcessedEpoch)
    const status =
      protectedEvent.epoch > LAST_DRYRUN_EPOCH
        ? ProtectedEventStatus.FACT
        : ProtectedEventStatus.DRYRUN
    protectedEventsWithValidator.push({
      status,
      protectedEvent,
      validator: validatorsMap[protectedEvent.vote_account] ?? null,
    })
  }

  for (const protectedEvent of estimatedProtectedEvents) {
    if (protectedEvent.epoch > latestProcessedEpoch) {
      protectedEventsWithValidator.push({
        status: ProtectedEventStatus.ESTIMATE,
        protectedEvent,
        validator: validatorsMap[protectedEvent.vote_account] ?? null,
      })
    }
  }

  let maxStatsEpoch = -Infinity
  for (const validator of validators) {
    for (const stat of validator.epoch_stats) {
      maxStatsEpoch = Math.max(maxStatsEpoch, stat.epoch)
    }
  }

  let maxScoredEpoch = 0
  for (const entry of scoring) {
    maxScoredEpoch = Math.max(entry.epoch, maxScoredEpoch)
  }

  const pushPenalty = (
    voteAccount: string,
    epoch: number,
    nativeStake: string,
    liquidStake: string,
    bidTooLowPenaltyPmpe: number,
  ) => {
    const penalty =
      ((Number(nativeStake) + Number(liquidStake)) * bidTooLowPenaltyPmpe) /
      1000
    if (penalty <= 0) return
    protectedEventsWithValidator.push({
      status: ProtectedEventStatus.ESTIMATE,
      protectedEvent: {
        epoch,
        amount: penalty,
        vote_account: voteAccount,
        meta: { funder: 'ValidatorBond' as const },
        reason: 'BidTooLowPenalty' as const,
      },
      validator: validatorsMap[voteAccount] ?? null,
    })
  }

  const auctionCoversCurrentEpoch = maxStatsEpoch >= maxScoredEpoch
  for (const entry of scoring) {
    if (entry.epoch <= latestProcessedEpoch) continue
    if (auctionCoversCurrentEpoch && entry.epoch === maxScoredEpoch) continue
    const validator = validatorsMap[entry.voteAccount] ?? null
    const epochStats = validator?.epoch_stats.find(
      ({ epoch }) => epoch === entry.epoch,
    )
    if (epochStats == null) continue
    pushPenalty(
      entry.voteAccount,
      entry.epoch,
      epochStats.marinade_native_stake ?? '0',
      epochStats.marinade_stake ?? '0',
      entry.revShare.bidTooLowPenaltyPmpe,
    )
  }

  if (auctionCoversCurrentEpoch) {
    for (const entry of auctionResult.auctionData.validators) {
      const v = validatorsMap[entry.voteAccount]
      pushPenalty(
        entry.voteAccount,
        maxStatsEpoch,
        v?.marinade_native_stake ?? '0',
        v?.marinade_stake ?? '0',
        entry.revShare.bidTooLowPenaltyPmpe,
      )
    }
  }

  return protectedEventsWithValidator
}

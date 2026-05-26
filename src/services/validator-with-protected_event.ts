import { LAST_DRYRUN_EPOCH } from './constants'
import { fetchProtectedEvents } from './protected-events'
import { calculateProtectedEventEstimates } from './protected-events-estimator'
import { loadSam } from './sam'
import { fetchScoring } from './scoring'
import { solToLamports } from './units'
import { fetchValidatorsWithEpochs } from './validators'

import type { ProtectedEvent, SettlementReason } from './protected-events'
import type { Validator } from './validators'
import type { QueryClient } from '@tanstack/react-query'

export type ProtectedEventStatus = 'dryrun' | 'estimate' | 'fact'
export type ProtectedEventWithValidator = {
  status: ProtectedEventStatus
  protectedEvent: ProtectedEvent
  validator: Validator | null
}

// Takes a QueryClient so the shared loadSam() result is read from the canonical
// ['sam'] cache via ensureQueryData — see fetchValidatorsWithBonds.
export const fetchProtectedEventsWithValidators = async (
  qc: QueryClient,
  signal?: AbortSignal,
): Promise<ProtectedEventWithValidator[]> => {
  const [
    { validators },
    { protected_events: protectedEvents },
    scoring,
    { auctionResult },
  ] = await Promise.all([
    // Canonical cache key shared with the validator-detail Payments tab, so the
    // 3-epoch validator payload (multi-MB) is fetched at most once.
    qc.ensureQueryData({
      queryKey: ['validators-with-epochs', 3],
      queryFn: ({ signal: s }) => fetchValidatorsWithEpochs(3, s),
    }),
    fetchProtectedEvents(signal),
    fetchScoring(signal),
    qc.ensureQueryData({ queryKey: ['sam'], queryFn: () => loadSam() }),
  ])

  const estimatedProtectedEvents = await calculateProtectedEventEstimates(
    validators,
    signal,
  )

  const validatorsMap: Record<string, Validator> = {}
  for (const validator of validators) {
    validatorsMap[validator.vote_account] = validator
  }

  let latestProcessedEpoch = 0
  const protectedEventsWithValidator: ProtectedEventWithValidator[] = []
  for (const protectedEvent of protectedEvents) {
    latestProcessedEpoch = Math.max(protectedEvent.epoch, latestProcessedEpoch)
    const status = protectedEvent.epoch > LAST_DRYRUN_EPOCH ? 'fact' : 'dryrun'
    protectedEventsWithValidator.push({
      status,
      protectedEvent,
      validator: validatorsMap[protectedEvent.vote_account] ?? null,
    })
  }

  for (const protectedEvent of estimatedProtectedEvents) {
    if (protectedEvent.epoch > latestProcessedEpoch) {
      protectedEventsWithValidator.push({
        status: 'estimate',
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

  const pushAuctionPenalty = (
    voteAccount: string,
    epoch: number,
    amountLamports: number,
    reason: SettlementReason,
  ) => {
    if (amountLamports <= 0) return
    protectedEventsWithValidator.push({
      status: 'estimate',
      protectedEvent: {
        epoch,
        amount: amountLamports,
        vote_account: voteAccount,
        meta: { funder: 'ValidatorBond' },
        reason,
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
    const stake =
      Number(epochStats.marinade_native_stake ?? '0') +
      Number(epochStats.marinade_stake ?? '0')
    pushAuctionPenalty(
      entry.voteAccount,
      entry.epoch,
      (stake * entry.revShare.bidTooLowPenaltyPmpe) / 1000,
      'BidTooLowPenalty',
    )
    pushAuctionPenalty(
      entry.voteAccount,
      entry.epoch,
      (stake * entry.revShare.blacklistPenaltyPmpe) / 1000,
      'BlacklistPenalty',
    )
    pushAuctionPenalty(
      entry.voteAccount,
      entry.epoch,
      Math.round(solToLamports(entry.values?.bondRiskFeeSol ?? 0)),
      'BondRiskFee',
    )
  }

  if (auctionCoversCurrentEpoch) {
    for (const entry of auctionResult.auctionData.validators) {
      const v = validatorsMap[entry.voteAccount]
      const stake =
        Number(v?.marinade_native_stake ?? '0') +
        Number(v?.marinade_stake ?? '0')
      pushAuctionPenalty(
        entry.voteAccount,
        maxStatsEpoch,
        (stake * entry.revShare.bidTooLowPenaltyPmpe) / 1000,
        'BidTooLowPenalty',
      )
      pushAuctionPenalty(
        entry.voteAccount,
        maxStatsEpoch,
        (stake * entry.revShare.blacklistPenaltyPmpe) / 1000,
        'BlacklistPenalty',
      )
      pushAuctionPenalty(
        entry.voteAccount,
        maxStatsEpoch,
        Math.round(solToLamports(entry.values?.bondRiskFeeSol ?? 0)),
        'BondRiskFee',
      )
    }
  }

  return protectedEventsWithValidator
}

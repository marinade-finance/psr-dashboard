import { ProtectedEvent, fetchProtectedEvents } from "./protected-events";
import { calculateProtectedEventEstimates } from "./protected-events-estimator";
import { Validator, fetchValidators, fetchValidatorsWithEpochs } from "./validators";
import { loadSam } from "./sam";
import { fetchScoring } from "./scoring";

export enum ProtectedEventStatus {
    DRYRUN, ESTIMATE, FACT
}
export type ProtectedEventWithValidator = {
    status: ProtectedEventStatus
    protectedEvent: ProtectedEvent
    validator: Validator | null
}

const LAST_DRYRUN_EPOCH = 608

export const fetchProtectedEventsWithValidator = async (): Promise<ProtectedEventWithValidator[]> => {
  const [{ validators }, { protected_events }, scoring, { auctionResult }] = await Promise.all([fetchValidatorsWithEpochs(3), fetchProtectedEvents(), fetchScoring(), loadSam()])

    const estimatedProtectedEvents = await calculateProtectedEventEstimates(validators)

    const validatorsMap: Record<string, Validator> = {}
    for (const validator of validators) {
        validatorsMap[validator.vote_account] = validator
    }

    let latestProcessedEpoch = 0
    const protectedEventsWithValidator: ProtectedEventWithValidator[] = []
    for (const protectedEvent of protected_events) {
        latestProcessedEpoch = Math.max(protectedEvent.epoch, latestProcessedEpoch)
        const status = protectedEvent.epoch > LAST_DRYRUN_EPOCH ? ProtectedEventStatus.FACT : ProtectedEventStatus.DRYRUN
        protectedEventsWithValidator.push({ status, protectedEvent, validator: validatorsMap[protectedEvent.vote_account] ?? null })
    }

    for (const protectedEvent of estimatedProtectedEvents) {
        if (protectedEvent.epoch > latestProcessedEpoch) {
            protectedEventsWithValidator.push({ status: ProtectedEventStatus.ESTIMATE, protectedEvent, validator: validatorsMap[protectedEvent.vote_account] ?? null })
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
      if (entry.epoch <= latestProcessedEpoch) {
        continue
      }
      const validator = validatorsMap[entry.voteAccount] ?? null
      const epochStats = validator?.epoch_stats.find(({ epoch }) => epoch == entry.epoch)
      if (epochStats == null) {
        continue
      }
      const penalty = (
        Number(epochStats.marinade_native_stake ?? "0")
          + Number(epochStats.marinade_stake ?? "0")
      ) * entry.revShare.bidTooLowPenaltyPmpe / 1000
      if (penalty > 0) {
        const protectedEvent = {
          epoch: entry.epoch,
          amount: penalty,
          vote_account: entry.voteAccount,
          meta: {funder: 'ValidatorBond' as 'ValidatorBond'},
          reason: 'BidTooLowPenalty' as 'BidTooLowPenalty',
        }
        protectedEventsWithValidator.push({
          status: ProtectedEventStatus.ESTIMATE,
          protectedEvent,
          validator,
        })
      }
    }

    if (maxStatsEpoch > maxScoredEpoch) {
      for (const entry of auctionResult.auctionData.validators) {
        const validator = validatorsMap[entry.voteAccount] ?? null
        const penalty = (
          Number(validator?.marinade_native_stake ?? "0")
            + Number(validator?.marinade_stake ?? "0")
        ) * entry.revShare.bidTooLowPenaltyPmpe / 1000
        if (penalty > 0) {
          const protectedEvent = {
            epoch: maxStatsEpoch,
            amount: penalty,
            vote_account: entry.voteAccount,
            meta: {funder: 'ValidatorBond' as 'ValidatorBond'},
            reason: 'BidTooLowPenalty' as 'BidTooLowPenalty',
          }
          protectedEventsWithValidator.push({
            status: ProtectedEventStatus.ESTIMATE,
            protectedEvent,
            validator,
          })
        }
      }
    }

    return protectedEventsWithValidator
};

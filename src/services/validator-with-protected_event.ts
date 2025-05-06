import { ProtectedEvent, fetchProtectedEvents } from "./protected-events";
import { calculateProtectedEventEstimates } from "./protected-events-estimator";
import { Validator, fetchValidators, fetchValidatorsWithEpochs } from "./validators";
import { loadSam } from "./sam";

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
  const [{ validators }, { protected_events }, { auctionResult }] = await Promise.all([fetchValidatorsWithEpochs(3), fetchProtectedEvents(), loadSam()])

    const estimatedProtectedEvents = await calculateProtectedEventEstimates(validators)

    const validatorsMap: Record<string, Validator> = {}
    for (const validator of validators) {
        validatorsMap[validator.vote_account] = validator
    }

    let latestProcessedEpoch = 0
    let latestEpoch = 0
    const protectedEventsWithValidator: ProtectedEventWithValidator[] = []
    for (const protectedEvent of protected_events) {
        latestProcessedEpoch = Math.max(protectedEvent.epoch, latestProcessedEpoch)
        const status = protectedEvent.epoch > LAST_DRYRUN_EPOCH ? ProtectedEventStatus.FACT : ProtectedEventStatus.DRYRUN
        protectedEventsWithValidator.push({ status, protectedEvent, validator: validatorsMap[protectedEvent.vote_account] ?? null })
    }

    for (const protectedEvent of estimatedProtectedEvents) {
        latestEpoch = Math.max(protectedEvent.epoch, latestEpoch)
        if (protectedEvent.epoch > latestProcessedEpoch) {
            protectedEventsWithValidator.push({ status: ProtectedEventStatus.ESTIMATE, protectedEvent, validator: validatorsMap[protectedEvent.vote_account] ?? null })
        }
    }

    for (const entry of auctionResult.auctionData.validators) {
      const validator = validatorsMap[entry.voteAccount] ?? null
      const penalty = (parseFloat(validator?.activated_stake ?? "0")) * entry.revShare.bidTooLowPenaltyPmpe / 1000
      if (penalty > 0) {
        const protectedEvent = {
          epoch: latestEpoch,
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

    return protectedEventsWithValidator
};

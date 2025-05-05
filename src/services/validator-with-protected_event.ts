import { ProtectedEvent, fetchProtectedEvents } from "./protected-events";
import { calculateProtectedEventEstimates } from "./protected-events-estimator";
import { Validator, fetchValidators, fetchValidatorsWithEpochs } from "./validators";
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
  const [{ validators }, { protected_events }, scoring] = await Promise.all([fetchValidatorsWithEpochs(3), fetchProtectedEvents(), fetchScoring(1000)])

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

    for (const entry of scoring) {
      const penalty = (entry.revShare as any).bidTooLowPenaltyPmpe as number
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
          validator: validatorsMap[entry.voteAccount] ?? null
        })
      }
    }

    return protectedEventsWithValidator
};

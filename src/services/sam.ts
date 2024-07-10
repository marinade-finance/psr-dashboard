import {
    DsSamSDK,
    InputsSource,
    AuctionResult,
    AuctionValidator,
    AuctionConstraintType, AuctionConstraint
} from '@marinade.finance/ds-sam-sdk'
import { fetchValidatorsWithEpochs } from './validators'

const estimateEpochsPerYear = async () => {
    const FETCHED_EPOCHS = 11
    const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
    const epochStats = validators.map(({ epoch_stats }) => epoch_stats).flat()

    const rangeStart = epochStats.reduce((acc, { epoch, epoch_start_at, epoch_end_at }) => {
        if (epoch_start_at === null || epoch_end_at === null) {
            return acc
        }
        if (epoch < acc.epoch) {
            return { epoch, timestamp: new Date(epoch_start_at).getTime() / 1e3 }
        }
        return acc
    }, { epoch: Infinity, timestamp: Infinity })

    const rangeEnd = epochStats.reduce((acc, { epoch, epoch_start_at, epoch_end_at }) => {
        if (epoch_start_at === null || epoch_end_at === null) {
            return acc
        }
        if (acc.epoch < epoch) {
            return { epoch, timestamp: new Date(epoch_end_at).getTime() / 1e3 }
        }
        return acc
    }, { epoch: 0, timestamp: 0 })

    const SECONDS_PER_YEAR = 365.25 * 24 * 3600
    const DEFAULT_EPOCH_DURATION = 0.4 * 432000
    const DEFAULT_EPOCHS_PER_YEAR = SECONDS_PER_YEAR / DEFAULT_EPOCH_DURATION
    const rangeDuration = rangeEnd.timestamp - rangeStart.timestamp
    const rangeEpochs = rangeEnd.epoch - rangeStart.epoch + 1
    if (!isFinite(rangeStart.epoch) || rangeEnd.epoch === 0) {
        return DEFAULT_EPOCHS_PER_YEAR
    }

    return SECONDS_PER_YEAR / (rangeDuration / rangeEpochs)
}

export const loadSam = async (): Promise<{ auctionResult: AuctionResult, epochsPerYear: number }> => {
    try {
        const epochsPerYear = await estimateEpochsPerYear()
        console.log('epochsPerYear', epochsPerYear)

        const dsSam = new DsSamSDK({ inputsSource: InputsSource.APIS, cacheInputs: false })
        const auctionResult = await dsSam.run()
        return { auctionResult, epochsPerYear }
    } catch (err) {
        console.log(err)
        throw err
    }
};

export const lastCapConstraintDescription = (constraint: AuctionConstraint): string => {
    switch (constraint.constraintType) {
        case AuctionConstraintType.COUNTRY:
            return `COUNTRY (${constraint.constraintName}) stake concentration`
        case AuctionConstraintType.ASO:
            return `ASO (${constraint.constraintName}) stake concentration`
        case AuctionConstraintType.VALIDATOR:
            return 'VALIDATOR stake concentration'
        case AuctionConstraintType.BOND:
            return 'BOND setup (balance & max stake wanted)'
        case AuctionConstraintType.MNDE:
            return 'MNDE votes'
        default:
            return '[unknown]'
    }
}

export const selectVoteAccount = (validator: AuctionValidator) => validator.voteAccount
export const selectMndeTargetStake = (validator: AuctionValidator) => validator.auctionStake.marinadeMndeTargetSol
export const selectSamTargetStake = (validator: AuctionValidator) => validator.auctionStake.marinadeSamTargetSol
export const selectMarinadeTargetStake = (validator: AuctionValidator) => selectSamTargetStake(validator) + selectMndeTargetStake(validator)
export const selectConstraintText = ({ lastCapConstraint }: AuctionValidator) => lastCapConstraint && lastCapConstraint.constraintType !== AuctionConstraintType.MNDE ? `Stake capped by ${lastCapConstraintDescription(lastCapConstraint)} constraint` : 'Stake amount not capped by constraints'

export const selectMndeDistributedStake = (validators: AuctionValidator[]) => validators.reduce((sum, validator) => sum + selectMndeTargetStake(validator), 0)
export const selectSamDistributedStake = (validators: AuctionValidator[]) => validators.reduce((sum, validator) => sum + selectSamTargetStake(validator), 0)

export const selectWinningAPY = (auctionResult: AuctionResult, epochsPerYear: number) => Math.pow(1 + auctionResult.winningTotalPmpe / 1e3, epochsPerYear) - 1

export const selectBid = (validator: AuctionValidator) => validator.revShare.bidPmpe
export const selectCommission = (validator: AuctionValidator) => validator.inflationCommissionDec
export const selectMevCommission = (validator: AuctionValidator): number | null => validator.mevCommissionDec

export const selectBondSize = (validator: AuctionValidator) => validator.bondBalanceSol

export const selectMaxAPY = (validator: AuctionValidator, epochsPerYear: number) => Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1

export const selectEffectiveBid = (auctionResult: AuctionResult, validator: AuctionValidator) => Math.round(validator.auctionStake.marinadeSamTargetSol) === 0 ? 0 : Math.min(Math.max(validator.revShare.bidPmpe - (validator.revShare.totalPmpe - auctionResult.winningTotalPmpe), 0), validator.revShare.bidPmpe)

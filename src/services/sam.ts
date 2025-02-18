import {
    DsSamSDK,
    InputsSource,
    AuctionResult,
    AuctionValidator,
    AuctionConstraintType,
    AuctionConstraint,
    bondBalanceRequiredForXEpochs,
    DsSamConfig
} from '@marinade.finance/ds-sam-sdk'
import { fetchValidatorsWithEpochs } from './validators'
import { Color } from 'src/components/table/table'

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

export const loadSam = async (): Promise<{ auctionResult: AuctionResult, epochsPerYear: number, dcSamConfig: DsSamConfig }> => {
    try {
        const epochsPerYear = await estimateEpochsPerYear()
        console.log('epochsPerYear', epochsPerYear)

        const dsSam = new DsSamSDK({ inputsSource: InputsSource.APIS, cacheInputs: false })
        const auctionResult = await dsSam.run()
        return { auctionResult, epochsPerYear, dcSamConfig: dsSam.config }
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
        default:
            return '[unknown]'
    }
}

export const selectVoteAccount = (validator: AuctionValidator) => validator.voteAccount
export const selectSamTargetStake = (validator: AuctionValidator) => validator.auctionStake.marinadeSamTargetSol
export const selectMaxWantedStake = (validator: AuctionValidator) => validator.maxStakeWanted
export const selectConstraintText = ({ lastCapConstraint }: AuctionValidator) => lastCapConstraint ? `Stake capped by ${lastCapConstraintDescription(lastCapConstraint)} constraint` : 'Stake amount not capped by constraints'

export const selectSamDistributedStake = (validators: AuctionValidator[]) => validators.reduce((sum, validator) => sum + selectSamTargetStake(validator), 0)

export const selectWinningAPY = (auctionResult: AuctionResult, epochsPerYear: number) => Math.pow(1 + auctionResult.winningTotalPmpe / 1e3, epochsPerYear) - 1

export const selectBid = (validator: AuctionValidator) => validator.revShare.bidPmpe
export const selectCommission = (validator: AuctionValidator) => validator.inflationCommissionDec
export const selectMevCommission = (validator: AuctionValidator): number | null => validator.mevCommissionDec

export const selectBondSize = (validator: AuctionValidator) => validator.bondBalanceSol

export const selectMaxAPY = (validator: AuctionValidator, epochsPerYear: number) => Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1

export const selectEffectiveBid = (validator: AuctionValidator) => validator.revShare.auctionEffectiveBidPmpe
export const selectEffectiveCost = (validator: AuctionValidator) => (validator.marinadeActivatedStakeSol / 1000) * validator.revShare.auctionEffectiveBidPmpe

export const bondColorState = (validator: AuctionValidator, samDistributedStake: number, maxMarinadeTvlSharePerValidatorDec: number): Color => {
    const maxValidatorStakeShare = maxMarinadeTvlSharePerValidatorDec * samDistributedStake
    const stake = validator.maxStakeWanted >= maxValidatorStakeShare ? maxValidatorStakeShare : validator.maxStakeWanted
    const bondReqTwoEpochs = bondBalanceRequiredForXEpochs(stake, validator, 2)
    const bondReqOneEpoch = bondBalanceRequiredForXEpochs(stake, validator, 1)
    if (validator.bondBalanceSol > bondReqTwoEpochs) {
        return Color.GREEN
    } else if (validator.bondBalanceSol <= bondReqTwoEpochs && validator.bondBalanceSol > bondReqOneEpoch) {
        return Color.YELLOW
    } else {
        return Color.RED
    }
}

export const bondTooltip = (color: Color) => {
    switch (color) {
        case Color.RED: return "Your bond balance is not sufficient to cover bidding costs and is limiting the maximum stake you can get. Top up your bond to increase your stake and stay in the auction."
        case Color.GREEN: return "You have enough in the bond to cover at least 2 epochs of bids."
        case Color.YELLOW: return "Your bond balance is sufficient only to cover one epoch of bids. Top up your bond with enough SOL to stay in the auction"
        default: return ""
    }
}

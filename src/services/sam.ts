import {
    DsSamSDK,
    InputsSource,
    AuctionResult,
    AuctionValidator,
    AuctionConstraintType, AuctionConstraint
} from '@marinade.finance/ds-sam-sdk'

export const loadSam = async (): Promise<AuctionResult> => {
    const dsSam = new DsSamSDK({ inputsSource: InputsSource.APIS, cacheInputs: false })
    return await dsSam.run()
};

export const EPOCHS_PER_YEAR = 365.25 * 24 * 3600 / (0.4 * 432000) // @TODO change to some actual value

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

export const selectWinningAPY = (auctionResult: AuctionResult) => Math.pow(1 + auctionResult.winningTotalPmpe / 1e3, EPOCHS_PER_YEAR) - 1

export const selectBid = (validator: AuctionValidator) => validator.revShare.bidPmpe
export const selectCommission = (validator: AuctionValidator) => validator.inflationCommissionDec
export const selectMevCommission = (validator: AuctionValidator): number | null => validator.mevCommissionDec

export const selectBondSize = (validator: AuctionValidator) => validator.bondBalanceSol

export const selectMaxAPY = (validator: AuctionValidator) => Math.pow(1 + validator.revShare.totalPmpe / 1e3, EPOCHS_PER_YEAR) - 1

export const selectEffectiveBid = (auctionResult: AuctionResult, validator: AuctionValidator) => validator.auctionStake.marinadeSamTargetSol === 0 ? 0 : Math.min(Math.max(validator.revShare.bidPmpe - (validator.revShare.totalPmpe - auctionResult.winningTotalPmpe), 0), validator.revShare.bidPmpe)

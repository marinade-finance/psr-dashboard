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

const loadSamConfig = async (): Promise<DsSamConfig> => {
    const url = 'https://raw.githubusercontent.com/marinade-finance/ds-sam-pipeline/main/auction-config.json'
    const response = await fetch(url)
    return response.json()
}

export const loadSam = async (): Promise<{ auctionResult: AuctionResult, epochsPerYear: number, dcSamConfig: DsSamConfig }> => {
    try {
        const epochsPerYear = await estimateEpochsPerYear()
        console.log('epochsPerYear', epochsPerYear)
        const config = await loadSamConfig()
        const dsSam = new DsSamSDK({ ...config, inputsSource: InputsSource.APIS, cacheInputs: false })
        const auctionResult = await dsSam.runFinalOnly()
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
        case AuctionConstraintType.REPUTATION:
            return `REPUTATION`
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

export const selectProjectedAPY = (auctionResult: AuctionResult, config: DsSamConfig, epochsPerYear: number) => {
  const profit = auctionResult.auctionData.validators.reduce(
    (acc, entry) => (
      acc + (
        entry.revShare.auctionEffectiveBidPmpe * (1 - 0.5)
          + entry.revShare.inflationPmpe
          + entry.revShare.mevPmpe
      ) * entry.marinadeActivatedStakeSol / 1000
    ),
    0
  )
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol + auctionResult.auctionData.stakeAmounts.marinadeMndeTvlSol
  return Math.pow(1 + profit / tvl, epochsPerYear) - 1
}

export const selectStakeToMove = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) => (
      acc + 
        Math.max(
          0,
          entry.marinadeActivatedStakeSol
            - (entry.auctionStake.marinadeSamTargetSol
              + entry.auctionStake.marinadeMndeTargetSol)
        )
    ),
    0
  )

export const selectActiveStake = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) => acc + entry.marinadeActivatedStakeSol,
    0
  )

export const selectProductiveStake = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) =>
      entry.revShare.bidPmpe >= entry.revShare.effParticipatingBidPmpe * 0.9
      ? acc + entry.marinadeActivatedStakeSol
      : acc,
    0
  )

export const selectBid = (validator: AuctionValidator) => validator.revShare.bidPmpe

export const selectCommission = (validator: AuctionValidator) =>
  validator.inflationCommissionDec

export const selectMevCommission = (validator: AuctionValidator): number | null =>
  validator.mevCommissionDec

export const selectBondSize = (validator: AuctionValidator) => validator.bondBalanceSol


export const selectSpendRobustReputation = (validator: AuctionValidator) =>
  validator.values.spendRobustReputation

export const selectMaxSamStake = (validator: AuctionValidator) =>
  Math.min(validator.values.adjMaxSpendRobustDelegation, validator.maxBondDelegation)

export const selectMaxAPY = (validator: AuctionValidator, epochsPerYear: number) =>
  Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  (validator.marinadeActivatedStakeSol / 1000) * validator.revShare.auctionEffectiveBidPmpe

export const selectMaxSpendRobustDelegation = (validator: AuctionValidator): number => {
  if (validator.revShare.totalPmpe > 0) {
    return validator.values.spendRobustReputation / (validator.revShare.totalPmpe / 1000)
  } else {
    return Infinity
  }
}


export const bondColorState = (validator: AuctionValidator): Color => {
    const stake = validator.auctionStake.marinadeSamTargetSol
    if (!stake) {
        return undefined
    }

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

export const spendRobustReputationTooltip = (validator: AuctionValidator) => {
  // the matches are approximate so that we start displaying the limiting
  // warning a bit (10%) before it actually happens
  if (0.9 * validator.values.adjMaxSpendRobustDelegation <= validator.auctionStake.marinadeSamTargetSol) {
    return "Your reputation will start capping your stake allocation. Hint: Increase your bond and participate in the auction regularly to build up your reputation to get more stake from Marinade."
  } else if (0.9 * selectMaxSpendRobustDelegation(validator) <= validator.auctionStake.marinadeSamTargetSol) {
    return "Your reputation may start capping your stake allocation if other validators get more reputation than you have. Hint: Increase your bond and participate in the auction regularly to build up your reputation to get more stake from Marinade."
  } else if (validator.values.spendRobustReputation < 100)  {
    return "Reputation will not limit your stake right now, but there is room to grow. Hint: Increase your bond and participate consistently to boost your reputation to get more stake from Marinade."
  } else if (0.9 * validator.bondBalanceSol < validator.values.spendRobustReputation)  {
    return "Your reputation is outstanding—thank you for your consistent participation! If you increase your bond, you will most likely get more stake from Marinade. Hint: Keep bidding high in each auction to maintain your reputation over time."
  } else {
    return "Your reputation is outstanding—thank you for your consistent participation! Hint: Keep bidding high in each auction to maintain your reputation over time."
  }
}

export const maxSamStakeTooltip = (validator: AuctionValidator, cfg: { maxTvlDelegation: number, minBondBalanceSol: number }) => {
  // the matches are approximate so that we start displaying the limiting
  // warning a bit (10%) before it actually happens
  if (validator.values.adjMaxSpendRobustDelegation <= validator.auctionStake.marinadeSamTargetSol) {
    return "Your reputation will start limiting your stake allocation. Hint: Increase your bond and participate in the auction regularly to build up your reputation to get more stake from Marinade."
  } else if (0.9 * cfg.maxTvlDelegation <= validator.auctionStake.marinadeSamTargetSol) {
    return "You have the maximum stake a single validator can get from Marinade."
  } else if (0.9 * validator.maxBondDelegation <= validator.auctionStake.marinadeSamTargetSol) {
    return "Your bond is limiting your stake allocation. Hint: Top up your bond to receive more stake."
  } else if (validator.bondBalanceSol <= cfg.minBondBalanceSol) {
    return `You bond is lower than the minimum amount of ${cfg.minBondBalanceSol} SOL.  Hint: Top up your bond to start receiving stake from Marinade.`
  } else {
    return ""
  }
}

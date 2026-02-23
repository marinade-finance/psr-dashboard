import {
  DsSamSDK,
  Auction,
  Debug,
  InputsSource,
  AuctionConstraintType,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { Color } from 'src/components/table/table'
import { formatPercentage } from 'src/format'

import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionResult,
  AuctionValidator,
  AuctionConstraint,
  DsSamConfig,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'

const estimateEpochsPerYear = async () => {
  const FETCHED_EPOCHS = 11
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
  const epochStats = validators.map(({ epoch_stats }) => epoch_stats).flat()

  const rangeStart = epochStats.reduce(
    (acc, { epoch, epoch_start_at, epoch_end_at }) => {
      if (epoch_start_at === null || epoch_end_at === null) {
        return acc
      }
      if (epoch < acc.epoch) {
        return { epoch, timestamp: new Date(epoch_start_at).getTime() / 1e3 }
      }
      return acc
    },
    { epoch: Infinity, timestamp: Infinity },
  )

  const rangeEnd = epochStats.reduce(
    (acc, { epoch, epoch_start_at, epoch_end_at }) => {
      if (epoch_start_at === null || epoch_end_at === null) {
        return acc
      }
      if (acc.epoch < epoch) {
        return { epoch, timestamp: new Date(epoch_end_at).getTime() / 1e3 }
      }
      return acc
    },
    { epoch: 0, timestamp: 0 },
  )

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

export const loadSam = async (
  dataOverrides?: SourceDataOverrides | null,
): Promise<{
  auctionResult: AuctionResult
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  epochsPerYear: number
  dcSamConfig: DsSamConfig
}> => {
  try {
    const epochsPerYear = await estimateEpochsPerYear()
    console.log('epochsPerYear', epochsPerYear)
    const config = await loadSamConfig()
    const dsSam = new DsSamSDK({
      ...config,
      inputsSource: InputsSource.APIS,
      cacheInputs: false,
      debugVoteAccounts: [],
      logVerbosity: LogVerbosity.ERROR,
    })

    // Fetch data once, run base auction via SDK
    const auctionResult = await dsSam.runFinalOnly(dataOverrides)

    // Run alternative auction with mutated aggregated data
    const runAlt = async (
      mutate: (
        agg: Awaited<ReturnType<typeof dsSam.getAggregatedData>>,
      ) => void,
    ) => {
      const agg = await dsSam.getAggregatedData(dataOverrides)
      mutate(agg)
      const debug = new Debug(new Set(), LogVerbosity.ERROR)
      const constraints = dsSam.getAuctionConstraints(agg, debug)
      const d = { ...agg, validators: dsSam.transformValidators(agg) }
      return new Auction(d, constraints, dsSam.config, debug).evaluate()
    }

    // +10% / -10% TVL sensitivity
    const joinResult = await runAlt(agg => {
      // eslint-disable-next-line no-param-reassign
      agg.stakeAmounts.marinadeSamTvlSol *= 1.1
      // eslint-disable-next-line no-param-reassign
      agg.stakeAmounts.marinadeRemainingSamSol *= 1.1
    })
    const tvlJoinApyDiff = selectTvlApyDiff(
      auctionResult,
      joinResult,
      epochsPerYear,
    )

    const leaveResult = await runAlt(agg => {
      // eslint-disable-next-line no-param-reassign
      agg.stakeAmounts.marinadeSamTvlSol *= 0.9
      // eslint-disable-next-line no-param-reassign
      agg.stakeAmounts.marinadeRemainingSamSol *= 0.9
    })
    const tvlLeaveApyDiff = selectTvlApyDiff(
      auctionResult,
      leaveResult,
      epochsPerYear,
    )

    // Backstop: blacklist top 5 validators by target stake
    const top5 = [...auctionResult.auctionData.validators]
      .sort(
        (a, b) =>
          b.auctionStake.marinadeSamTargetSol -
          a.auctionStake.marinadeSamTargetSol,
      )
      .slice(0, 5)

    const backstopResult = await runAlt(agg => {
      for (const v of top5) agg.blacklist.add(v.voteAccount)
    })
    const backstopDiff = selectTargetApyDiff(
      auctionResult,
      backstopResult,
      epochsPerYear,
    )
    const backstopTvl = top5.reduce(
      (sum, v) => sum + v.auctionStake.marinadeSamTargetSol,
      0,
    )

    return {
      auctionResult,
      tvlJoinApyDiff,
      tvlLeaveApyDiff,
      backstopDiff,
      backstopTvl,
      epochsPerYear,
      dcSamConfig: dsSam.config,
    }
  } catch (err) {
    console.log(err)
    throw err
  }
}

export type { SourceDataOverrides }

export const lastCapConstraintDescription = (
  constraint: AuctionConstraint,
): string => {
  switch (constraint.constraintType) {
    case AuctionConstraintType.COUNTRY:
      return `COUNTRY (${constraint.constraintName}) stake concentration`
    case AuctionConstraintType.ASO:
      return `ASO (${constraint.constraintName}) stake concentration`
    case AuctionConstraintType.VALIDATOR:
      return 'VALIDATOR stake concentration'
    case AuctionConstraintType.BOND:
      return 'BOND setup (bond balance is too low)'
    case AuctionConstraintType.WANT:
      return 'WANT (max stake wanted)'
    case 'MNDE' as AuctionConstraintType:
      return 'MNDE (bid too low or too little mnde votes)'
    default:
      return '[unknown]'
  }
}

export const selectVoteAccount = (validator: AuctionValidator) =>
  validator.voteAccount
export const selectSamTargetStake = (validator: AuctionValidator) =>
  validator.auctionStake.marinadeSamTargetSol
export const selectSamActiveStake = (validator: AuctionValidator) =>
  validator.marinadeActivatedStakeSol
export const selectMaxWantedStake = (validator: AuctionValidator) =>
  validator.maxStakeWanted
export const selectConstraintText = ({
  lastCapConstraint,
}: AuctionValidator) =>
  lastCapConstraint
    ? `Stake capped by ${lastCapConstraintDescription(lastCapConstraint)} constraint`
    : 'Stake amount not capped by constraints'

export const selectSamDistributedStake = (validators: AuctionValidator[]) =>
  validators.reduce(
    (sum, validator) => sum + selectSamTargetStake(validator),
    0,
  )

export const selectWinningAPY = (
  auctionResult: AuctionResult,
  epochsPerYear: number,
) => Math.pow(1 + auctionResult.winningTotalPmpe / 1e3, epochsPerYear) - 1

export const selectProjectedAPY = (
  auctionResult: AuctionResult,
  config: DsSamConfig,
  epochsPerYear: number,
) => {
  const profit = auctionResult.auctionData.validators.reduce(
    (acc, entry) =>
      acc +
      ((entry.revShare.auctionEffectiveBidPmpe +
        entry.revShare.inflationPmpe +
        entry.revShare.mevPmpe) *
        entry.marinadeActivatedStakeSol) /
        1000,
    0,
  )
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  return Math.pow(1 + profit / tvl, epochsPerYear) - 1
}

export const selectStakeToMove = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) =>
      acc +
      Math.max(
        0,
        entry.marinadeActivatedStakeSol -
          entry.auctionStake.marinadeSamTargetSol,
      ),
    0,
  )

export const selectTotalActiveStake = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) => acc + entry.marinadeActivatedStakeSol,
    0,
  )

export const selectIsNonProductive = (validator: AuctionValidator) =>
  validator.revShare.bondObligationPmpe <
  validator.revShare.effParticipatingBidPmpe * 0.9

export const selectProductiveStake = (auctionResult: AuctionResult) =>
  auctionResult.auctionData.validators.reduce(
    (acc, entry) =>
      !selectIsNonProductive(entry)
        ? acc + entry.marinadeActivatedStakeSol
        : acc,
    0,
  )

const overridesMessage = (
  label: string,
  overrideValue: number | null | undefined,
  type: 'percentage' | 'number' = 'percentage',
): string => {
  if (overrideValue != null) {
    const formattedValue =
      type === 'percentage'
        ? `${formatPercentage(overrideValue, 0)}`
        : overrideValue.toString()
    return `<b>Overrides ${label}: ${formattedValue}</b><br/>`
  }
  return ''
}

export const selectBid = (validator: AuctionValidator) =>
  validator.revShare.bidPmpe

export const selectBondBid = (validator: AuctionValidator) =>
  validator.values?.commissions?.bidCpmpeInBondDec ?? validator.bidCpmpe

export const overridesCpmpeMessage = (validator: AuctionValidator): string => {
  return overridesMessage(
    'CPMPE',
    validator.values?.commissions?.bidCpmpeOverrideDec,
    'number',
  )
}

export const selectCommission = (validator: AuctionValidator): number =>
  validator.inflationCommissionDec

export const selectFormattedInBondCommission = (
  validator: AuctionValidator,
): string => {
  const inBondCommission =
    validator.values?.commissions?.inflationCommissionInBondDec
  return inBondCommission == null ? '-' : formatPercentage(inBondCommission, 0)
}

export const formattedOnChainCommission = (
  validator: AuctionValidator,
): string => {
  const onChainCommission =
    validator.values?.commissions?.inflationCommissionOnchainDec ||
    selectCommission(validator)
  return onChainCommission == null
    ? '-'
    : formatPercentage(onChainCommission, 0)
}

export const overridesCommissionMessage = (
  validator: AuctionValidator,
): string => {
  return overridesMessage(
    'inflation commission',
    validator.values?.commissions?.inflationCommissionOverrideDec,
  )
}

export const selectCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.inflationPmpe

export const selectMevCommission = (
  validator: AuctionValidator,
): number | null => validator.mevCommissionDec

export const formattedMevCommission = (validator: AuctionValidator): string => {
  const mevCommission = selectMevCommission(validator)
  return mevCommission == null ? '-' : formatPercentage(mevCommission, 0)
}

export const formattedInBondMevCommission = (
  validator: AuctionValidator,
): string => {
  const inBondMevCommission =
    validator.values?.commissions?.mevCommissionInBondDec
  return inBondMevCommission == null
    ? '-'
    : formatPercentage(inBondMevCommission, 0)
}

export const formattedOnChainMevCommission = (
  validator: AuctionValidator,
): string => {
  const onChainMevCommission =
    validator.values?.commissions?.mevCommissionOnchainDec ||
    selectMevCommission(validator)
  return onChainMevCommission == null
    ? '-'
    : formatPercentage(onChainMevCommission, 0)
}

export const selectMevCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.mevPmpe

export const overridesMevCommissionMessage = (
  validator: AuctionValidator,
): string => {
  return overridesMessage(
    'MEV commission',
    validator.values?.commissions?.mevCommissionOverrideDec,
  )
}

export const selectBlockRewardsCommission = (
  validator: AuctionValidator,
): number | null => validator.blockRewardsCommissionDec

export const formattedBlockRewardsCommission = (
  validator: AuctionValidator,
): string => {
  const blockRewardsCommission = selectBlockRewardsCommission(validator)
  return blockRewardsCommission == null
    ? formatPercentage(1, 0)
    : formatPercentage(blockRewardsCommission, 0)
}

export const formattedInBondBlockRewardsCommission = (
  validator: AuctionValidator,
): string => {
  const inBondBlockRewardsCommission =
    validator.values?.commissions?.blockRewardsCommissionInBondDec
  return inBondBlockRewardsCommission == null
    ? '-'
    : formatPercentage(inBondBlockRewardsCommission, 0)
}

export const selectBlockRewardsCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.blockPmpe

export const overridesBlockRewardsCommissionMessage = (
  validator: AuctionValidator,
): string => {
  return overridesMessage(
    'block rewards commission',
    validator.values?.commissions?.blockRewardsCommissionOverrideDec,
  )
}

export const selectBondSize = (validator: AuctionValidator) =>
  validator.bondBalanceSol

export const selectMaxAPY = (
  validator: AuctionValidator,
  epochsPerYear: number,
) => Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  (validator.marinadeActivatedStakeSol / 1000) *
  validator.revShare.auctionEffectiveBidPmpe

export const bondColorState = (validator: AuctionValidator): Color => {
  const stake = validator.auctionStake.marinadeSamTargetSol
  if (!stake) {
    return undefined
  }
  if (validator.bondGoodForNEpochs > 10) {
    return Color.GREEN
  } else if (validator.bondGoodForNEpochs > 2) {
    return Color.YELLOW
  } else {
    return Color.RED
  }
}

export const bondTooltip = (color: Color) => {
  switch (color) {
    case Color.RED:
      return 'Your bond balance is not sufficient to cover bidding costs and is limiting the maximum stake you can get. Top up your bond to increase your stake and stay in the auction.'
    case Color.GREEN:
      return 'You have enough in the bond to cover at least 2 epochs of bids.'
    case Color.YELLOW:
      return 'Your bond balance is sufficient only to cover one epoch of bids. Top up your bond with enough SOL to stay in the auction'
    default:
      return ''
  }
}

export const selectActuallyUnprotectedStake = (
  auctionResult: AuctionResult,
): number => {
  return auctionResult.auctionData.validators.reduce((sum, v) => {
    const target = v.auctionStake.marinadeSamTargetSol
    if (target == null) {
      return sum
    }
    const bondOnlyCap = v.bondSamStakeCapSol - v.unprotectedStakeSol
    return sum + Math.max(0, target - bondOnlyCap)
  }, 0)
}

export const selectTargetProtectedPct = (
  auctionResult: AuctionResult,
): number => {
  const totalTarget = selectSamDistributedStake(
    auctionResult.auctionData.validators,
  )
  if (totalTarget === 0) {
    return 1
  }
  return 1 - selectActuallyUnprotectedStake(auctionResult) / totalTarget
}

export const selectTargetApyDiff = (
  baseResult: AuctionResult,
  altResult: AuctionResult,
  epochsPerYear: number,
): number => {
  const profitOf = (r: AuctionResult) =>
    r.auctionData.validators.reduce(
      (acc, v) =>
        acc +
        ((v.revShare.auctionEffectiveBidPmpe +
          v.revShare.inflationPmpe +
          v.revShare.mevPmpe) *
          v.auctionStake.marinadeSamTargetSol) /
          1000,
      0,
    )

  const tvl = baseResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const baseApy = Math.pow(1 + profitOf(baseResult) / tvl, epochsPerYear) - 1
  const altApy = Math.pow(1 + profitOf(altResult) / tvl, epochsPerYear) - 1
  return altApy - baseApy
}

export const selectTvlApyDiff = (
  baseResult: AuctionResult,
  altResult: AuctionResult,
  epochsPerYear: number,
): number => {
  const profitOf = (r: AuctionResult) =>
    r.auctionData.validators.reduce(
      (acc, v) =>
        acc +
        ((v.revShare.auctionEffectiveBidPmpe +
          v.revShare.inflationPmpe +
          v.revShare.mevPmpe) *
          v.marinadeActivatedStakeSol) /
          1000,
      0,
    )

  const baseTvl = baseResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const altTvl = altResult.auctionData.stakeAmounts.marinadeSamTvlSol

  const baseApy =
    Math.pow(1 + profitOf(baseResult) / baseTvl, epochsPerYear) - 1
  const altApy = Math.pow(1 + profitOf(altResult) / altTvl, epochsPerYear) - 1
  return altApy - baseApy
}

export const maxSamStakeTooltip = (
  validator: AuctionValidator,
  cfg: { maxTvlDelegation: number; minBondBalanceSol: number },
) => {
  // the matches are approximate so that we start displaying the limiting
  // warning a bit (10%) before it actually happens
  if (
    0.9 * cfg.maxTvlDelegation <=
    validator.auctionStake.marinadeSamTargetSol
  ) {
    return 'You have the maximum stake a single validator can get from Marinade.'
  } else if (
    0.9 * validator.maxBondDelegation <=
    validator.auctionStake.marinadeSamTargetSol
  ) {
    return 'Your bond is limiting your stake allocation. Hint: Top up your bond to receive more stake.'
  } else if (validator.bondBalanceSol <= cfg.minBondBalanceSol) {
    return `You bond is lower than the minimum amount of ${cfg.minBondBalanceSol} SOL.  Hint: Top up your bond to start receiving stake from Marinade.`
  } else {
    return ''
  }
}

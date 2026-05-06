import {
  DsSamSDK,
  InputsSource,
  AuctionConstraintType,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { formatPercentage } from 'src/format'

import {
  bondHealthColor,
  bondRunwayEpochs,
  bondUtilizationPct,
  compoundApy,
  selectMaxWantedStake,
} from './calculations'
import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionResult,
  AuctionValidator,
  AuctionConstraint,
  DsSamConfig,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'
import type { Color } from 'src/services/types'

// Solana epoch = 432000 slots × 0.4s/slot = 172800s = 48h exactly
const EPOCHS_PER_YEAR = (365.25 * 24 * 3600) / 172800

type SamResult = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dcSamConfig: DsSamConfig
}

export const loadSam = async (
  dataOverrides?: SourceDataOverrides | null,
): Promise<SamResult> => {
  const config = await loadSamConfig()
  const dsSam = new DsSamSDK({
    ...config,
    inputsSource: InputsSource.APIS,
    cacheInputs: false,
    debugVoteAccounts: [],
    logVerbosity: LogVerbosity.ERROR,
  })

  const auctionResult = await dsSam.runFinalOnly(dataOverrides)

  return {
    auctionResult,
    epochsPerYear: EPOCHS_PER_YEAR,
    dcSamConfig: dsSam.config,
  }
}

export type { SourceDataOverrides }

const FETCHED_EPOCHS = 11

// AugmentedAuctionValidator: AuctionValidator with expectedStakeChangeSol attached.
// Used by the SAM-active tooltip to display expected next-epoch stake change.
export type AugmentedAuctionValidator = Omit<AuctionValidator, 'values'> & {
  values: NonNullable<AuctionValidator['values']> & {
    expectedStakeChangeSol: number
  }
}

export const fetchValidatorNames = async (): Promise<Map<string, string>> => {
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
  const nameByVote = new Map<string, string>()
  for (const v of validators) {
    if (v.info_name) nameByVote.set(v.vote_account, v.info_name)
  }
  return nameByVote
}

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

const totalProfitPmpe = (v: AuctionValidator) =>
  v.revShare.auctionEffectiveBidPmpe +
  v.revShare.inflationPmpe +
  v.revShare.mevPmpe

const selectActiveProfit = (validators: AuctionValidator[]) =>
  validators.reduce(
    (acc, v) => acc + (totalProfitPmpe(v) * v.marinadeActivatedStakeSol) / 1000,
    0,
  )

export const selectProjectedAPY = (
  auctionResult: AuctionResult,
  epochsPerYear: number,
) => {
  const profit = selectActiveProfit(auctionResult.auctionData.validators)
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

function overridesMessage(
  label: string,
  overrideValue: number | null | undefined,
  type: 'percentage' | 'number' = 'percentage',
): string {
  if (overrideValue == null) {
    return ''
  }
  const formatted =
    type === 'percentage'
      ? formatPercentage(overrideValue, 0)
      : String(overrideValue)
  return `<b>Overrides ${label}: ${formatted}</b><br/>`
}

export const selectBid = (validator: AuctionValidator) =>
  validator.revShare.bidPmpe

export const selectBondBid = (validator: AuctionValidator) =>
  validator.values?.commissions?.bidCpmpeInBondDec ?? validator.bidCpmpe

export const overridesCpmpeMessage = (validator: AuctionValidator): string =>
  overridesMessage(
    'CPMPE',
    validator.values?.commissions?.bidCpmpeOverrideDec,
    'number',
  )

export const selectCommission = (validator: AuctionValidator): number =>
  validator.inflationCommissionDec

export const selectFormattedInBondCommission = (
  validator: AuctionValidator,
): string => {
  const dec = validator.values?.commissions?.inflationCommissionInBondDec
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const formattedOnChainCommission = (
  validator: AuctionValidator,
): string => {
  const dec =
    validator.values?.commissions?.inflationCommissionOnchainDec ??
    selectCommission(validator)
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const overridesCommissionMessage = (
  validator: AuctionValidator,
): string =>
  overridesMessage(
    'inflation commission',
    validator.values?.commissions?.inflationCommissionOverrideDec,
  )

export const selectCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.inflationPmpe

export const selectMevCommission = (
  validator: AuctionValidator,
): number | null => validator.mevCommissionDec

export const formattedMevCommission = (validator: AuctionValidator): string => {
  const dec = selectMevCommission(validator)
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const formattedInBondMevCommission = (
  validator: AuctionValidator,
): string => {
  const dec = validator.values?.commissions?.mevCommissionInBondDec
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const formattedOnChainMevCommission = (
  validator: AuctionValidator,
): string => {
  const dec =
    validator.values?.commissions?.mevCommissionOnchainDec ??
    selectMevCommission(validator)
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const selectMevCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.mevPmpe

export const overridesMevCommissionMessage = (
  validator: AuctionValidator,
): string =>
  overridesMessage(
    'MEV commission',
    validator.values?.commissions?.mevCommissionOverrideDec,
  )

export const selectBlockRewardsCommission = (
  validator: AuctionValidator,
): number | null => validator.blockRewardsCommissionDec

export const formattedBlockRewardsCommission = (
  validator: AuctionValidator,
): string => {
  const v = selectBlockRewardsCommission(validator)
  return formatPercentage(v ?? 1, 0)
}

export const selectBlockRewardsCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.blockPmpe

export const overridesBlockRewardsCommissionMessage = (
  validator: AuctionValidator,
): string =>
  overridesMessage(
    'block rewards commission',
    validator.values?.commissions?.blockRewardsCommissionOverrideDec,
  )

export const selectBondSize = (validator: AuctionValidator) =>
  validator.bondBalanceSol

export const selectBondHealth = (
  validator: AuctionValidator,
  minBondEpochs: number,
) => bondRunwayEpochs(validator, minBondEpochs)

export const selectMaxAPY = (
  validator: AuctionValidator,
  epochsPerYear: number,
) => compoundApy(validator.revShare.totalPmpe, epochsPerYear)

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  (validator.marinadeActivatedStakeSol / 1000) *
  validator.revShare.auctionEffectiveBidPmpe

export { bondHealthColor }

export const selectActuallyUnprotectedStake = (
  auctionResult: AuctionResult,
): number =>
  auctionResult.auctionData.validators.reduce((sum, validator) => {
    const target = validator.auctionStake.marinadeSamTargetSol
    if (target == null) {
      return sum
    }
    return (
      sum +
      Math.max(
        0,
        target - (validator.bondSamStakeCapSol - validator.unprotectedStakeSol),
      )
    )
  }, 0)

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

export { selectMaxWantedStake }

export const EPOCH_REBALANCE_RATE = 0.007 // ~0.7% of TVL moves per epoch

/**
 * Expected stake change for each validator next epoch.
 * Sorts by totalPmpe descending (highest bidder priority), greedily allocates
 * inflows up to budget = 0.7% * TVL, distributes outflows proportionally
 * among validators over their target.
 */
export function buildExpectedStakeChanges(
  validators: AuctionValidator[],
  tvlSol: number,
): Map<string, number> {
  const budget = tvlSol * EPOCH_REBALANCE_RATE

  const rawDelta = (v: AuctionValidator) =>
    v.auctionStake.marinadeSamTargetSol - v.marinadeActivatedStakeSol

  const sorted = [...validators].sort(
    (a, b) => (b.revShare.totalPmpe ?? 0) - (a.revShare.totalPmpe ?? 0),
  )

  const result = new Map<string, number>()
  let remaining = budget
  for (const v of sorted) {
    const delta = rawDelta(v)
    if (delta > 0 && remaining > 0) {
      const alloc = Math.min(delta, remaining)
      result.set(v.voteAccount, alloc)
      remaining -= alloc
    }
  }

  const totalInflows = [...result.values()].reduce((s, x) => s + x, 0)
  if (totalInflows === 0) return result

  const losers = validators.filter(v => rawDelta(v) < 0)
  const totalExcess = losers.reduce((s, v) => s + Math.abs(rawDelta(v)), 0)
  if (totalExcess > 0) {
    for (const v of losers) {
      const share = Math.abs(rawDelta(v)) / totalExcess
      result.set(v.voteAccount, -totalInflows * share)
    }
  }

  return result
}

export const selectExpectedStakeChange = (
  voteAccount: string,
  stakeChanges: Map<string, number>,
): number => stakeChanges.get(voteAccount) ?? 0

export const formattedInBondBlockRewardsCommission = (
  validator: AuctionValidator,
): string => {
  const dec = validator.values?.commissions?.blockRewardsCommissionInBondDec
  return dec == null ? '-' : formatPercentage(dec, 0)
}

export const selectBondUtilization = (validator: AuctionValidator): number =>
  bondUtilizationPct(validator) / 100

export const bondColorState = (
  validator: AuctionValidator,
): Color | undefined => bondHealthColor(validator, 0)

export const maxSamStakeTooltip = (
  validator: AuctionValidator,
  cfg: { maxTvlDelegation: number; minBondBalanceSol: number },
): string => {
  if (0.9 * cfg.maxTvlDelegation <= validator.auctionStake.marinadeSamTargetSol)
    return 'You have the maximum stake a single validator can get from Marinade.'
  if (
    0.9 * validator.maxBondDelegation <=
    validator.auctionStake.marinadeSamTargetSol
  )
    return 'Your bond is limiting your stake allocation. Hint: Top up your bond to receive more stake.'
  if (validator.bondBalanceSol <= cfg.minBondBalanceSol)
    return `Your bond is lower than the minimum amount of ${cfg.minBondBalanceSol} SOL. Hint: Top up your bond to start receiving stake from Marinade.`
  return ''
}

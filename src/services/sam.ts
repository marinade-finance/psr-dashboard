import {
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'
import {
  allocateRedelegation,
  annualize,
  compoundApy,
  EPOCHS_PER_YEAR,
  pmpeToSol,
  selectNonBidPmpe,
} from '@marinade.finance/ds-sam-calc'

import { pct } from 'src/format'

import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Pure stake-change / redelegation / concentration calc and the per-validator
// selectors moved to @marinade.finance/ds-sam-calc; re-exported so existing
// imports from 'src/services/sam' keep resolving. IO (loadSam) and the
// display-formatting selectors below stay in the dashboard.
export {
  selectInSet,
  selectPaidUndelegationSol,
  selectNonBidPmpe,
  allocateRedelegation,
  augmentAuctionResult,
  selectRedelegationBudget,
  selectRedelegationPriorityFrontierPmpe,
  selectRedelegationPriorityRank,
  selectExpectedStakeChange,
  selectExpectedStakeChangeBreakdown,
  selectCutoffRank,
  selectValidatorConcentration,
  type AugmentedAuctionValidator,
  type ExpectedStakeChangeBreakdown,
  type ConcentrationContext,
  type ValidatorConcentration,
} from '@marinade.finance/ds-sam-calc'

type SamResult = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
}

const FETCHED_EPOCHS = 11

// Derive epochsPerYear from the average real epoch duration over the last
// FETCHED_EPOCHS epochs (epoch_start_at / epoch_end_at timestamps) — matches
// the production calculation, where epochs currently run slightly under the
// 48h nominal. Falls back to the nominal constant (EPOCHS_PER_YEAR) when
// timestamps are unavailable, e.g. during an extended outage.
const estimateEpochsPerYear = async (): Promise<number> => {
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
  const epochStats = validators.flatMap(({ epoch_stats }) => epoch_stats)

  const rangeStart = epochStats.reduce(
    (acc, { epoch, epoch_start_at }) => {
      if (epoch_start_at === null || epoch >= acc.epoch) return acc
      return { epoch, timestamp: new Date(epoch_start_at).getTime() / 1e3 }
    },
    { epoch: Infinity, timestamp: Infinity },
  )

  const rangeEnd = epochStats.reduce(
    (acc, { epoch, epoch_end_at }) => {
      if (epoch_end_at === null || epoch <= acc.epoch) return acc
      return { epoch, timestamp: new Date(epoch_end_at).getTime() / 1e3 }
    },
    { epoch: 0, timestamp: 0 },
  )

  if (!isFinite(rangeStart.epoch) || rangeEnd.epoch === 0) {
    return EPOCHS_PER_YEAR
  }

  const SECONDS_PER_YEAR = 365.25 * 24 * 3600
  const rangeDuration = rangeEnd.timestamp - rangeStart.timestamp
  const rangeEpochs = rangeEnd.epoch - rangeStart.epoch + 1
  return SECONDS_PER_YEAR / (rangeDuration / rangeEpochs)
}

// Fetches the live auction. Simulation with overrides goes through
// runSdkRerun (single source of truth); loadSam does not accept overrides.
export const loadSam = async (): Promise<SamResult> => {
  const epochsPerYear = await estimateEpochsPerYear()
  const config = await loadSamConfig()
  const dsSam = new DsSamSDK({
    ...config,
    inputsSource: InputsSource.APIS,
    cacheInputs: false,
    debugVoteAccounts: [],
    logVerbosity: LogVerbosity.ERROR,
  })

  const auctionResult = await dsSam.runFinalOnly()

  return {
    auctionResult,
    epochsPerYear,
    dsSamConfig: dsSam.config,
  }
}

export const fetchValidatorNames = async (): Promise<Map<string, string>> => {
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
  const nameByVote = new Map<string, string>()
  for (const validator of validators) {
    if (validator.info_name)
      nameByVote.set(validator.vote_account, validator.info_name)
  }
  return nameByVote
}

export const selectVoteAccount = (validator: AuctionValidator) =>
  validator.voteAccount
export const selectSamTargetStake = (validator: AuctionValidator) =>
  validator.auctionStake.marinadeSamTargetSol
export const selectSamActiveStake = (validator: AuctionValidator) =>
  validator.marinadeActivatedStakeSol

export const selectSamDistributedStake = (validators: AuctionValidator[]) =>
  validators.reduce(
    (sum, validator) => sum + selectSamTargetStake(validator),
    0,
  )

export const selectWinningAPY = (
  auctionResult: AuctionResult,
  epochsPerYear: number,
) => compoundApy(auctionResult.winningTotalPmpe, epochsPerYear)

// Rebuild the winning APY at THIS validator's commission profile: take the
// marginal winner's bid component and add it to the validator's own
// inflation/MEV/block revenue. Answers "would I clear at the auction-
// clearing bid?" — apples-to-apples for the APY pill in validator-detail.
export function selectWinningApyForValidator(
  v: AuctionValidator,
  auctionResult: AuctionResult,
  epochsPerYear: number,
  minBondBalanceSol: number,
): number {
  const { marginalWinner } = allocateRedelegation(
    auctionResult,
    minBondBalanceSol,
  )
  const winningBidPmpe = marginalWinner
    ? Math.max(
        0,
        auctionResult.winningTotalPmpe - selectNonBidPmpe(marginalWinner),
      )
    : 0
  return compoundApy(selectNonBidPmpe(v) + winningBidPmpe, epochsPerYear)
}

const totalProfitPmpe = (v: AuctionValidator) =>
  v.revShare.auctionEffectiveBidPmpe +
  v.revShare.inflationPmpe +
  v.revShare.mevPmpe +
  (v.revShare.blockPmpe ?? 0)

const selectActiveProfit = (validators: AuctionValidator[]) =>
  validators.reduce(
    (acc, v) =>
      acc + pmpeToSol(totalProfitPmpe(v), v.marinadeActivatedStakeSol),
    0,
  )

export const selectProjectedAPY = (
  auctionResult: AuctionResult,
  epochsPerYear: number,
) => {
  const profit = selectActiveProfit(auctionResult.auctionData.validators)
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  if (tvl <= 0) return 0
  return annualize(profit / tvl, epochsPerYear)
}

function overridesMessage(
  label: string,
  overrideValue: number | null | undefined,
  type: 'percentage' | 'number' = 'percentage',
): string {
  if (overrideValue == null) {
    return ''
  }
  const formatted =
    type === 'percentage' ? pct(overrideValue, 0) : String(overrideValue)
  return `Overrides ${label}: ${formatted}`
}

export const selectBid = (validator: AuctionValidator) =>
  validator.revShare.bidPmpe

export const overridesCpmpeMessage = (validator: AuctionValidator): string =>
  overridesMessage(
    'Cost PMPE',
    validator.values?.commissions?.bidCpmpeOverrideDec,
    'number',
  )

export const selectCommission = (validator: AuctionValidator): number =>
  validator.inflationCommissionDec

export const selectCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.inflationPmpe

export const formattedMevCommission = (validator: AuctionValidator): string => {
  const dec = validator.mevCommissionDec
  return dec == null ? '-' : pct(dec, 0)
}

export const selectMevCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.mevPmpe

export const formattedBlockRewardsCommission = (
  validator: AuctionValidator,
): string => pct(validator.blockRewardsCommissionDec ?? 1, 0)

export const selectBlockRewardsCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.blockPmpe

export const selectBondSize = (validator: AuctionValidator) =>
  validator.bondBalanceSol

export const selectMaxAPY = (
  validator: AuctionValidator,
  epochsPerYear: number,
) => compoundApy(validator.revShare.totalPmpe, epochsPerYear)

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  pmpeToSol(
    validator.revShare.auctionEffectiveBidPmpe,
    validator.marinadeActivatedStakeSol,
  )

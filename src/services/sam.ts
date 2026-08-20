import {
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'
import {
  epochDurationSecondsFromSlotsPerYear,
  pmpeToApy,
  pmpeToSol,
} from '@marinade.finance/ts-common'

import { pct } from 'src/format'

import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionData,
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Pure stake-change / redelegation calc and the per-validator selectors moved
// to @marinade.finance/ds-sam-calc; re-exported so existing imports from
// 'src/services/sam' keep resolving. IO (loadSam) and the display-formatting
// selectors below stay in the dashboard.
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
  type AugmentedAuctionValidator,
  type ExpectedStakeChangeBreakdown,
  type ConcentrationContext,
  type ValidatorConcentration,
} from '@marinade.finance/ds-sam-calc'

// Concentration is the one selector NOT re-exported from ds-sam-calc: the
// shared one divides by the auction's total SAM target, while the caps it is
// rendered against are enforced on total network stake. See
// ./concentration.ts.
export { selectValidatorConcentration } from './concentration'

type SamResult = {
  auctionResult: AuctionResult
  epochDurationSeconds: number
  dsSamConfig: DsSamConfig
}

// The auction's own slot-time regime is the only basis consistent with its
// numbers: the SDK normalises the inflation window to this same nominal, so
// annualizing against a measured multi-epoch average would count the SIMD-0525
// slot-time step twice. Decimal in, plain number out — the UI does float math.
export const selectEpochDurationSeconds = (auctionData: AuctionData): number =>
  epochDurationSecondsFromSlotsPerYear(
    auctionData.slotParams.slotsPerYear,
  ).toNumber()

// Fetches the live auction. Simulation with overrides goes through
// runSdkRerun (single source of truth); loadSam does not accept overrides.
export const loadSam = async (): Promise<SamResult> => {
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
    epochDurationSeconds: selectEpochDurationSeconds(auctionResult.auctionData),
    dsSamConfig: dsSam.config,
  }
}

export const fetchValidatorNames = async (): Promise<Map<string, string>> => {
  // Names live on the validator record, not on epoch_stats — asking for zero
  // epochs keeps 8 MB of per-epoch history off the wire.
  const { validators } = await fetchValidatorsWithEpochs(0)
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
  epochDurationSeconds: number,
) => pmpeToApy(auctionResult.winningTotalPmpe, epochDurationSeconds).toNumber()

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
  epochDurationSeconds: number,
) => pmpeToApy(validator.revShare.totalPmpe, epochDurationSeconds).toNumber()

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  pmpeToSol(
    validator.revShare.auctionEffectiveBidPmpe,
    validator.marinadeActivatedStakeSol,
  ).toNumber()

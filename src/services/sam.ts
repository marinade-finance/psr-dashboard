import {
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { formatPercentage } from 'src/format'

import {
  bondRunwayEpochs,
  bondUtilizationPct,
  compoundApy,
} from './calculations'
import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'

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

export const overridesCpmpeMessage = (validator: AuctionValidator): string =>
  overridesMessage(
    'CPMPE',
    validator.values?.commissions?.bidCpmpeOverrideDec,
    'number',
  )

export const selectCommission = (validator: AuctionValidator): number =>
  validator.inflationCommissionDec

export const selectCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.inflationPmpe

export const selectMevCommission = (
  validator: AuctionValidator,
): number | null => validator.mevCommissionDec

export const formattedMevCommission = (validator: AuctionValidator): string => {
  const dec = selectMevCommission(validator)
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

// Budget = TVL − Σactive: the already-liquid pool reserve that can be
// redelegated in the next epoch without waiting for any unstake cooldown.
function selectRedelegationBudget(auctionResult: AuctionResult): number {
  const validators = auctionResult.auctionData.validators
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const active = validators.reduce((s, v) => s + v.marinadeActivatedStakeSol, 0)
  return Math.max(0, tvl - active)
}

// ~0.7% of TVL is withdrawn from the pool each epoch by redeemers.
const WITHDRAWAL_FRACTION_PER_EPOCH = 0.007

// Natural withdrawals are drawn pro-rata from over-target validators first;
// falls back to pro-rata by active stake if nobody is over target.
function computeNaturalWithdrawal(
  validators: AuctionValidator[],
  tvl: number,
): Map<string, number> {
  const out = new Map<string, number>()
  const withdrawal = WITHDRAWAL_FRACTION_PER_EPOCH * tvl
  if (withdrawal <= 0) return out
  const excess = validators.map(v => ({
    va: v.voteAccount,
    x: Math.max(
      0,
      v.marinadeActivatedStakeSol - v.auctionStake.marinadeSamTargetSol,
    ),
  }))
  const totalExcess = excess.reduce((s, e) => s + e.x, 0)
  let remaining = withdrawal
  if (totalExcess > 0) {
    for (const { va, x } of excess) {
      if (x <= 0) continue
      const share = Math.min(x, (withdrawal * x) / totalExcess)
      if (share > 0) {
        out.set(va, share)
        remaining -= share
      }
    }
    if (remaining <= 1e-9) return out
  }
  const totalActive = validators.reduce(
    (s, v) => s + v.marinadeActivatedStakeSol,
    0,
  )
  if (totalActive <= 0) return out
  for (const v of validators) {
    const add = (remaining * v.marinadeActivatedStakeSol) / totalActive
    if (add > 0) out.set(v.voteAccount, (out.get(v.voteAccount) ?? 0) + add)
  }
  return out
}

function computeExpectedStakeChanges(
  auctionResult: AuctionResult,
): Map<string, number> {
  const validators = auctionResult.auctionData.validators
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const budget = selectRedelegationBudget(auctionResult)
  const rawDelta = (v: AuctionValidator) =>
    v.auctionStake.marinadeSamTargetSol - v.marinadeActivatedStakeSol
  const result = new Map<string, number>()

  if (budget > 0) {
    const sorted = [...validators].sort(
      (a, b) => (b.revShare.totalPmpe ?? 0) - (a.revShare.totalPmpe ?? 0),
    )
    let remaining = budget
    for (const v of sorted) {
      const delta = rawDelta(v)
      if (delta > 0 && remaining > 0) {
        const alloc = Math.min(delta, remaining)
        result.set(v.voteAccount, alloc)
        remaining -= alloc
      }
    }
  }

  const withdrawals = computeNaturalWithdrawal(validators, tvl)
  for (const [va, w] of withdrawals) {
    result.set(va, (result.get(va) ?? 0) - w)
  }

  for (const v of validators) {
    const paid = v.values?.paidUndelegationSol ?? 0
    if (paid <= 0) continue
    // Paid undelegation can only remove stake above the auction target
    const overTarget = Math.max(
      0,
      v.marinadeActivatedStakeSol - v.auctionStake.marinadeSamTargetSol,
    )
    const effectivePaid = Math.min(paid, overTarget)
    if (effectivePaid > 0) {
      result.set(
        v.voteAccount,
        (result.get(v.voteAccount) ?? 0) - effectivePaid,
      )
    }
  }

  return result
}

export function augmentAuctionResult(
  auctionResult: AuctionResult,
): AugmentedAuctionValidator[] {
  const changes = computeExpectedStakeChanges(auctionResult)
  return auctionResult.auctionData.validators.map(v => ({
    ...v,
    values: {
      ...v.values,
      expectedStakeChangeSol: changes.get(v.voteAccount) ?? 0,
    } as AugmentedAuctionValidator['values'],
  }))
}

export const selectExpectedStakeChange = (
  v: AugmentedAuctionValidator,
): number => v.values.expectedStakeChangeSol ?? 0

export const selectBondUtilization = (validator: AuctionValidator): number =>
  bondUtilizationPct(validator) / 100

import {
  AuctionConstraintType,
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { pct } from 'src/format'

import { bondRunwayEpochs, compoundApy } from './calculations'
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

// AugmentedAuctionValidator: AuctionValidator with derived per-validator fields
// pre-computed. expectedStakeChangeSol drives the next-epoch delta display.
// cutoffRank is the position relative to the auction cutoff: positive = above
// (1 = closest to cutoff), negative = below (-1 = closest to cutoff).
export type AugmentedAuctionValidator = Omit<AuctionValidator, 'values'> & {
  values: NonNullable<AuctionValidator['values']> & {
    expectedStakeChangeSol: number
    cutoffRank: number
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
) => Math.pow(1 + auctionResult.winningTotalPmpe / 1e3, epochsPerYear) - 1

// Rebuild the winning APY at THIS validator's commission profile: take the
// marginal winner's bid component and add it to the validator's own
// inflation/MEV/block revenue. Answers "would I clear at the auction-
// clearing bid?" — apples-to-apples for the APY pill in validator-detail.
export function selectWinningApyForValidator(
  v: AuctionValidator,
  auctionResult: AuctionResult,
  epochsPerYear: number,
): number {
  const { winningTotalPmpe } = auctionResult
  let marginal: AuctionValidator | null = null
  for (const w of auctionResult.auctionData.validators) {
    if (w.auctionStake.marinadeSamTargetSol <= 0) continue
    if (!marginal || w.revShare.totalPmpe < marginal.revShare.totalPmpe)
      marginal = w
  }
  const m = marginal?.revShare
  const winningBidPmpe = m
    ? Math.max(
        0,
        winningTotalPmpe - m.inflationPmpe - m.mevPmpe - (m.blockPmpe ?? 0),
      )
    : 0
  const r = v.revShare
  return compoundApy(
    r.inflationPmpe + r.mevPmpe + (r.blockPmpe ?? 0) + winningBidPmpe,
    epochsPerYear,
  )
}

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
  if (tvl <= 0) return 0
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
    type === 'percentage' ? pct(overrideValue, 0) : String(overrideValue)
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
  return dec == null ? '-' : pct(dec, 0)
}

export const selectMevCommissionPmpe = (validator: AuctionValidator) =>
  validator.revShare.mevPmpe

export const selectBlockRewardsCommission = (
  validator: AuctionValidator,
): number | null => validator.blockRewardsCommissionDec

export const formattedBlockRewardsCommission = (
  validator: AuctionValidator,
): string => {
  const v = selectBlockRewardsCommission(validator)
  return pct(v ?? 1, 0)
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
  const excess = validators.map(validator => ({
    va: validator.voteAccount,
    x: Math.max(
      0,
      validator.marinadeActivatedStakeSol -
        validator.auctionStake.marinadeSamTargetSol,
    ),
  }))
  const totalExcess = excess.reduce((sum, entry) => sum + entry.x, 0)
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
  for (const validator of validators) {
    const add = (remaining * validator.marinadeActivatedStakeSol) / totalActive
    if (add > 0)
      out.set(
        validator.voteAccount,
        (out.get(validator.voteAccount) ?? 0) + add,
      )
  }
  return out
}

// Paid undelegation is a one-time outflow whose freed capacity returns to
// the redelegation budget the same epoch (TVL − Σactive grows by exactly
// Σpaid). Effective post-undelegation active = active − paid; below-target
// winners (vs that effective active) absorb the augmented budget greedily by
// totalPmpe. Natural withdrawal (~0.7% TVL) is the only true outflow.
// SDK truth: calcBondRiskFee uses projectedActivatedStakeSol = max(0, active
// − paidUndelegationSol) as the post-undelegation baseline; we mirror that.
function computeExpectedStakeChanges(
  auctionResult: AuctionResult,
): Map<string, number> {
  const validators = auctionResult.auctionData.validators
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const paidOf = (v: AuctionValidator) => v.values?.paidUndelegationSol ?? 0
  const totalPaid = validators.reduce(
    (sum, validator) => sum + paidOf(validator),
    0,
  )
  const budget = selectRedelegationBudget(auctionResult) + totalPaid
  const effectiveActive = (v: AuctionValidator) =>
    v.marinadeActivatedStakeSol - paidOf(v)
  const rawDelta = (v: AuctionValidator) =>
    v.auctionStake.marinadeSamTargetSol - effectiveActive(v)
  const result = new Map<string, number>()

  for (const validator of validators) {
    const paid = paidOf(validator)
    if (paid > 0) result.set(validator.voteAccount, -paid)
  }

  if (budget > 0) {
    const sorted = [...validators].sort(
      (va, vb) => (vb.revShare.totalPmpe ?? 0) - (va.revShare.totalPmpe ?? 0),
    )
    let remaining = budget
    for (const validator of sorted) {
      const delta = rawDelta(validator)
      if (delta > 0 && remaining > 0) {
        const alloc = Math.min(delta, remaining)
        result.set(
          validator.voteAccount,
          (result.get(validator.voteAccount) ?? 0) + alloc,
        )
        remaining -= alloc
      }
    }
  }

  const withdrawals = computeNaturalWithdrawal(validators, tvl)
  for (const [va, w] of withdrawals) {
    result.set(va, (result.get(va) ?? 0) - w)
  }

  return result
}

export function augmentAuctionResult(
  auctionResult: AuctionResult,
): AugmentedAuctionValidator[] {
  const validators = auctionResult.auctionData.validators
  const changes = computeExpectedStakeChanges(auctionResult)
  const cutoffRanks = new Map<string, number>()
  const inSetByApyAsc = validators
    .filter(v => v.auctionStake.marinadeSamTargetSol > 0)
    .sort((a, b) => (a.revShare?.totalPmpe ?? 0) - (b.revShare?.totalPmpe ?? 0))
  inSetByApyAsc.forEach((v, i) => cutoffRanks.set(v.voteAccount, i + 1))
  const outOfSetByApyDesc = validators
    .filter(v => v.auctionStake.marinadeSamTargetSol <= 0)
    .sort((a, b) => (b.revShare?.totalPmpe ?? 0) - (a.revShare?.totalPmpe ?? 0))
  outOfSetByApyDesc.forEach((v, i) => cutoffRanks.set(v.voteAccount, -(i + 1)))

  return validators.map(validator => ({
    ...validator,
    values: {
      ...validator.values,
      expectedStakeChangeSol: changes.get(validator.voteAccount) ?? 0,
      cutoffRank: cutoffRanks.get(validator.voteAccount) ?? 0,
    } as AugmentedAuctionValidator['values'],
  }))
}

export const selectExpectedStakeChange = (
  v: AugmentedAuctionValidator,
): number => v.values.expectedStakeChangeSol ?? 0

export const selectCutoffRank = (v: AugmentedAuctionValidator): number =>
  v.values.cutoffRank ?? 0

export type ConcentrationRow = {
  key: string
  samStakeSol: number
  pctOfTotal: number
  validatorCount: number
  atCap: boolean
  cappedValidatorCount: number
}

export type ConcentrationBreakdown = {
  countries: ConcentrationRow[]
  asos: ConcentrationRow[]
  countryCapPct: number
  asoCapPct: number
}

export const buildConcentrationBreakdown = (
  auctionResult: AuctionResult,
  config: DsSamConfig,
): ConcentrationBreakdown => {
  const validators = auctionResult.auctionData.validators
  const aggregate = (
    pick: (v: AuctionValidator) => string,
    capType: AuctionConstraintType,
  ): ConcentrationRow[] => {
    const by = new Map<
      string,
      { stake: number; count: number; capped: number }
    >()
    let total = 0
    for (const v of validators) {
      const stake = v.auctionStake.marinadeSamTargetSol
      if (stake <= 0) continue
      const k = pick(v) || '—'
      const e = by.get(k) ?? { stake: 0, count: 0, capped: 0 }
      e.stake += stake
      e.count += 1
      if (
        v.lastCapConstraint?.constraintType === capType &&
        v.lastCapConstraint.constraintName === k
      ) {
        e.capped += 1
      }
      by.set(k, e)
      total += stake
    }
    const rows: ConcentrationRow[] = [...by.entries()].map(([key, e]) => ({
      key,
      samStakeSol: e.stake,
      validatorCount: e.count,
      pctOfTotal: total > 0 ? e.stake / total : 0,
      atCap: e.capped > 0,
      cappedValidatorCount: e.capped,
    }))
    rows.sort((a, b) => b.samStakeSol - a.samStakeSol)
    return rows
  }
  return {
    countries: aggregate(v => v.country, AuctionConstraintType.COUNTRY),
    asos: aggregate(v => v.aso, AuctionConstraintType.ASO),
    countryCapPct: config.maxNetworkStakeConcentrationPerCountryDec,
    asoCapPct: config.maxNetworkStakeConcentrationPerAsoDec,
  }
}

// Budget for next-epoch re-delegation: TVL − Σ active is the pool stake
// already liquid in the reserve, free to (re)delegate without waiting for
// any cooldown. Natural withdrawals exit the pool to redeemers, not budget.
export function selectRedelegationBudget(auctionResult: AuctionResult): number {
  const validators = auctionResult.auctionData.validators
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const activeTotal = validators.reduce(
    (s, v) => s + v.marinadeActivatedStakeSol,
    0,
  )
  return Math.max(0, tvl - activeTotal)
}

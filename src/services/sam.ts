import {
  AuctionConstraintType,
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { pct } from 'src/format'

import { compoundApy } from './calculations'
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
// pre-computed. expectedStakeChangeSol drives the next-epoch delta display and
// decomposes into three signed components that always sum to it:
//   paidUndelegationSol (≤0)      outflow paid this epoch
//   redelegationInflowSol (≥0)    inflow from budget into below-target winners
//   naturalWithdrawalSol (≤0)     pro-rata redeemer outflow
// cutoffRank is the dense position relative to the auction cutoff: 0 = at the
// winning total PMPE, +1 = closest distinct tier above (ties share a rank),
// -1 = closest distinct tier below.
export type AugmentedAuctionValidator = Omit<AuctionValidator, 'values'> & {
  values: NonNullable<AuctionValidator['values']> & {
    expectedStakeChangeSol: number
    expectedStakePaidUndelegationSol: number
    expectedStakeRedelegationInflowSol: number
    expectedStakeNaturalWithdrawalSol: number
    cutoffRank: number
  }
}

type ExpectedStakeChange = {
  total: number
  paidUndelegation: number
  redelegationInflow: number
  naturalWithdrawal: number
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

export const selectInSet = (v: AuctionValidator): boolean =>
  v.auctionStake.marinadeSamTargetSol > 0

export const selectPaidUndelegationSol = (v: AuctionValidator): number =>
  v.values?.paidUndelegationSol ?? 0

export const selectNonBidPmpe = (v: AuctionValidator): number =>
  v.revShare.inflationPmpe + v.revShare.mevPmpe + (v.revShare.blockPmpe ?? 0)

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

type RedelegationAllocation = {
  // Greedy inflow awarded to each below-target winner, keyed by vote account.
  inflowByVote: Map<string, number>
  // Lowest revShare.totalPmpe among winners that received their FULL
  // below-target delta this run. A validator must clear this to be sure of
  // full priority allocation. null when the budget covered everyone (or
  // there was no budget / no below-target winner) — no binding frontier.
  priorityFrontierPmpe: number | null
}

// Shared greedy redelegation allocation. Both the per-validator expected
// stake change and the auction-wide priority frontier read from this one
// pass so the two never drift apart. Validators are filled in descending
// revShare.totalPmpe order until the budget runs out; a validator is
// "fully satisfied" when its entire below-target delta fit before the
// budget was exhausted.
//
// Memoised per AuctionResult identity: called by computeExpectedStakeChanges,
// selectRedelegationPriorityFrontierPmpe, and computeNextEpochStake — same
// auction would otherwise run the greedy pass 3× per validator-detail open.
const allocationCache = new WeakMap<AuctionResult, RedelegationAllocation>()

function allocateRedelegation(
  auctionResult: AuctionResult,
): RedelegationAllocation {
  const cached = allocationCache.get(auctionResult)
  if (cached) return cached
  const validators = auctionResult.auctionData.validators
  const totalPaid = validators.reduce(
    (sum, validator) => sum + selectPaidUndelegationSol(validator),
    0,
  )
  const budget = selectRedelegationBudget(auctionResult) + totalPaid
  const effectiveActive = (v: AuctionValidator) =>
    v.marinadeActivatedStakeSol - selectPaidUndelegationSol(v)
  const rawDelta = (v: AuctionValidator) =>
    v.auctionStake.marinadeSamTargetSol - effectiveActive(v)

  const inflowByVote = new Map<string, number>()
  let priorityFrontierPmpe: number | null = null
  if (budget > 0) {
    const sorted = [...validators].sort(
      (va, vb) => (vb.revShare.totalPmpe ?? 0) - (va.revShare.totalPmpe ?? 0),
    )
    let remaining = budget
    for (const validator of sorted) {
      const delta = rawDelta(validator)
      if (delta > 0 && remaining > 0) {
        const alloc = Math.min(delta, remaining)
        inflowByVote.set(
          validator.voteAccount,
          (inflowByVote.get(validator.voteAccount) ?? 0) + alloc,
        )
        remaining -= alloc
        if (alloc >= delta) {
          priorityFrontierPmpe = validator.revShare.totalPmpe ?? 0
        }
      }
    }
  }
  const result = { inflowByVote, priorityFrontierPmpe }
  allocationCache.set(auctionResult, result)
  return result
}

// Paid undelegation is a one-time outflow whose freed capacity returns to
// the redelegation budget the same epoch (TVL − Σactive grows by exactly
// Σpaid). Effective post-undelegation active = active − paid; below-target
// winners (vs that effective active) absorb the augmented budget greedily by
// totalPmpe. Natural withdrawal (~0.7% TVL) is the only true outflow.
// SDK truth: calcBondRiskFee uses projectedActivatedStakeSol = max(0, active
// − paidUndelegationSol) as the post-undelegation baseline; we mirror that.
// Bond below SDK's minBondBalanceSol: clipBondStakeCap returns 0, so the
// validator loses ALL current stake regardless of bid (mirrors the
// tip-engine cascade). The full outflow is attributed to paid undelegation
// (forced removal), redelegation inflow is zeroed (a sub-min-bond validator
// cannot receive budget), natural withdrawal is suppressed so the three
// signed components still sum exactly to expectedStakeChangeSol.
function computeExpectedStakeChanges(
  auctionResult: AuctionResult,
  minBondBalanceSol: number,
): Map<string, ExpectedStakeChange> {
  const validators = auctionResult.auctionData.validators
  const tvl = auctionResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const bondBelowMin = (v: AuctionValidator) =>
    (v.bondBalanceSol ?? 0) < minBondBalanceSol
  const result = new Map<string, ExpectedStakeChange>()
  const get = (va: string): ExpectedStakeChange => {
    let entry = result.get(va)
    if (!entry) {
      entry = {
        total: 0,
        paidUndelegation: 0,
        redelegationInflow: 0,
        naturalWithdrawal: 0,
      }
      result.set(va, entry)
    }
    return entry
  }

  for (const validator of validators) {
    if (bondBelowMin(validator)) {
      const entry = get(validator.voteAccount)
      entry.paidUndelegation = -validator.marinadeActivatedStakeSol
      entry.total = -validator.marinadeActivatedStakeSol
      continue
    }
    const paid = selectPaidUndelegationSol(validator)
    if (paid > 0) {
      const entry = get(validator.voteAccount)
      entry.paidUndelegation = -paid
      entry.total += -paid
    }
  }

  const byVote = new Map(validators.map(v => [v.voteAccount, v] as const))

  const { inflowByVote } = allocateRedelegation(auctionResult)
  for (const [va, alloc] of inflowByVote) {
    const validator = byVote.get(va)
    if (validator && bondBelowMin(validator)) continue
    const entry = get(va)
    entry.redelegationInflow += alloc
    entry.total += alloc
  }

  const withdrawals = computeNaturalWithdrawal(validators, tvl)
  for (const [va, w] of withdrawals) {
    const validator = byVote.get(va)
    if (validator && bondBelowMin(validator)) continue
    const entry = get(va)
    entry.naturalWithdrawal -= w
    entry.total -= w
  }

  return result
}

export function augmentAuctionResult(
  auctionResult: AuctionResult,
  minBondBalanceSol: number,
): AugmentedAuctionValidator[] {
  const validators = auctionResult.auctionData.validators
  const changes = computeExpectedStakeChanges(auctionResult, minBondBalanceSol)
  // Dense rank around the winning total PMPE: ties share a position, the
  // marginal winner sits at 0. Above-cutoff is +1 (closest tier above), below
  // is -1 (closest tier below). Ranking by totalPmpe (not maxApy) avoids the
  // epochs-per-year wobble — the auction clears on totalPmpe directly.
  const eps = 1e-9
  const win = auctionResult.winningTotalPmpe
  const pmpes = validators.map(v => v.revShare.totalPmpe)
  const above = [...new Set(pmpes.filter(p => p > win + eps))].sort(
    (a, b) => a - b,
  )
  const below = [...new Set(pmpes.filter(p => p < win - eps))].sort(
    (a, b) => b - a,
  )
  const cutoffRanks = new Map<string, number>()
  for (const v of validators) {
    const p = v.revShare.totalPmpe
    const rank =
      Math.abs(p - win) < eps
        ? 0
        : p > win
          ? 1 + above.indexOf(p)
          : -1 - below.indexOf(p)
    cutoffRanks.set(v.voteAccount, rank)
  }

  return validators.map(validator => {
    const change = changes.get(validator.voteAccount)
    return {
      ...validator,
      values: {
        ...validator.values,
        expectedStakeChangeSol: change?.total ?? 0,
        expectedStakePaidUndelegationSol: change?.paidUndelegation ?? 0,
        expectedStakeRedelegationInflowSol: change?.redelegationInflow ?? 0,
        expectedStakeNaturalWithdrawalSol: change?.naturalWithdrawal ?? 0,
        cutoffRank: cutoffRanks.get(validator.voteAccount) ?? 0,
      } as AugmentedAuctionValidator['values'],
    }
  })
}

export const selectExpectedStakeChange = (
  v: AugmentedAuctionValidator,
): number => v.values.expectedStakeChangeSol ?? 0

export type ExpectedStakeChangeBreakdown = Omit<ExpectedStakeChange, 'total'>

export const selectExpectedStakeChangeBreakdown = (
  v: AugmentedAuctionValidator,
): ExpectedStakeChangeBreakdown => ({
  paidUndelegation: v.values.expectedStakePaidUndelegationSol ?? 0,
  redelegationInflow: v.values.expectedStakeRedelegationInflowSol ?? 0,
  naturalWithdrawal: v.values.expectedStakeNaturalWithdrawalSol ?? 0,
})

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

// Lowest revShare.totalPmpe among winners that got their full below-target
// delta from this run's greedy redelegation. A validator wanting guaranteed
// priority inflow next epoch must clear this. Returns 0 when the budget
// reached everyone (or there was none / no below-target winner) — there is
// no binding frontier, any in-set validator is already served.
export function selectRedelegationPriorityFrontierPmpe(
  auctionResult: AuctionResult,
): number {
  return allocateRedelegation(auctionResult).priorityFrontierPmpe ?? 0
}

// 1-based position of this validator in the exact order the redelegation
// budget is handed out: revShare.totalPmpe descending — the same sort key
// the greedy pass uses. Ties share the lower position. This is the true
// delegation-priority rank, not the maxApy-derived sam-table rank; the
// greedy pass orders strictly on totalPmpe, so this is the rank that
// decides whether the budget reaches you before it runs dry.
//
// Memoised per AuctionResult: the table-B advisory calls this per detail
// open; the lookup map is built once and shared across calls.
const priorityRankCache = new WeakMap<AuctionResult, Map<string, number>>()

function getPriorityRanks(auctionResult: AuctionResult): Map<string, number> {
  const cached = priorityRankCache.get(auctionResult)
  if (cached) return cached
  const sorted = [...auctionResult.auctionData.validators].sort(
    (a, b) => (b.revShare.totalPmpe ?? 0) - (a.revShare.totalPmpe ?? 0),
  )
  const ranks = new Map<string, number>()
  let prevPmpe: number | null = null
  let groupRank = 0
  sorted.forEach((v, i) => {
    const pmpe = v.revShare.totalPmpe ?? 0
    if (pmpe !== prevPmpe) {
      groupRank = i + 1
      prevPmpe = pmpe
    }
    ranks.set(v.voteAccount, groupRank)
  })
  priorityRankCache.set(auctionResult, ranks)
  return ranks
}

export function selectRedelegationPriorityRank(
  v: AuctionValidator,
  auctionResult: AuctionResult,
): number {
  return getPriorityRanks(auctionResult).get(v.voteAccount) ?? 1
}

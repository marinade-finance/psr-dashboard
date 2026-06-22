import {
  AuctionConstraintType,
  DsSamSDK,
  InputsSource,
  loadSamConfig,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import { pct } from 'src/format'

import { annualize, compoundApy } from './calculations'
import { EPOCHS_PER_YEAR, pmpeToSol } from './constants'
import { fetchValidatorsWithEpochs } from './validators'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
type SamResult = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
}

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
    epochsPerYear: EPOCHS_PER_YEAR,
    dsSamConfig: dsSam.config,
  }
}

const FETCHED_EPOCHS = 11

// AugmentedAuctionValidator: AuctionValidator with derived per-validator fields
// pre-computed. expectedStakeChangeSol drives the next-epoch delta display and
// decomposes into three signed components that always sum to it:
//   paidUndelegationSol (≤0)      scheduled undelegation outflow (only when target < active)
//   redelegationInflowSol (≥0)    inflow from the 1% rotation budget
//   naturalWithdrawalSol (≤0)     rotation outflow (over-target excess, lowest unstakePriority first)
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
) => compoundApy(auctionResult.winningTotalPmpe, epochsPerYear)

// Rebuild the winning APY at THIS validator's commission profile: take the
// marginal winner's bid component and add it to the validator's own
// inflation/MEV/block revenue. Answers "would I clear at the auction-
// clearing bid?" — apples-to-apples for the APY pill in validator-detail.
export function selectWinningApyForValidator(
  v: AuctionValidator,
  auctionResult: AuctionResult,
  epochsPerYear: number,
): number {
  const { marginalWinner } = allocateRedelegation(auctionResult)
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

export const selectInSet = (v: AuctionValidator): boolean =>
  v.auctionStake.marinadeSamTargetSol > 0

export const selectPaidUndelegationSol = (v: AuctionValidator): number =>
  v.values?.paidUndelegationSol ?? 0

export const selectNonBidPmpe = (v: AuctionValidator): number =>
  v.revShare.inflationPmpe + v.revShare.mevPmpe + (v.revShare.blockPmpe ?? 0)

export const selectEffectiveCost = (validator: AuctionValidator) =>
  pmpeToSol(
    validator.revShare.auctionEffectiveBidPmpe,
    validator.marinadeActivatedStakeSol,
  )

// Natural redelegation-turnover cap: ~1% of TVL redistributed each epoch.
// Not SDK-exported; maintained here until the SDK exposes it.
const WITHDRAWAL_FRACTION_PER_EPOCH = 0.01

// 1%-TVL rotation: sorted by unstakePriority asc (lowest prio unstaked first),
// takes each validator's over-target excess until the budget is exhausted.
function computeNaturalWithdrawal(
  validators: AuctionValidator[],
  tvl: number,
): Map<string, number> {
  const out = new Map<string, number>()
  let remaining = WITHDRAWAL_FRACTION_PER_EPOCH * tvl
  if (remaining <= 0) return out
  const prio = (v: AuctionValidator) =>
    Number.isFinite(v.unstakePriority) ? v.unstakePriority : Infinity
  const sorted = [...validators].sort((a, b) => prio(a) - prio(b))
  for (const v of sorted) {
    const excess = Math.max(
      0,
      v.marinadeActivatedStakeSol - v.auctionStake.marinadeSamTargetSol,
    )
    if (excess <= 0) continue
    const take = Math.min(excess, remaining)
    out.set(v.voteAccount, take)
    remaining -= take
    if (remaining <= 0) break
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
  // 1-based standard rank (ties share the higher position) over ALL validators
  // sorted by revShare.totalPmpe descending — the exact order the greedy
  // budget is handed out in.
  rankByVote: Map<string, number>
  // Lowest-totalPmpe in-set validator — the auction-clearing winner whose
  // bid component sets the winningBidPmpe. null when nobody is in set.
  marginalWinner: AuctionValidator | null
}

// Shared greedy redelegation allocation. The per-validator expected stake
// change, the auction-wide priority frontier, the totalPmpe-desc rank used
// by next-epoch advice, and the marginal-winner reference used by the
// auction APY math all read from this one pass so these four consumers never
// drift apart from each other.
// Validators are walked in descending revShare.totalPmpe order; a validator
// is "fully satisfied" when its entire below-target delta fit before the
// budget was exhausted.
//
// Estimate caveat: this pass does NOT enforce the SDK's concentration caps
// (country / ASO / per-validator / maxStakeWanted) that auction.evaluate()
// applies during stake distribution. The estimate assumes no such cap binds
// for the validator; a capped-out validator will show more inflow / a better
// frontier position here than the SDK would actually grant.
//
// Memoised per AuctionResult identity: called by computeExpectedStakeChanges,
// selectRedelegationPriorityFrontierPmpe, selectRedelegationPriorityRank,
// selectWinningApyForValidator, and computeNextEpochStake — same auction
// would otherwise run the greedy pass once per consumer per detail open.
const allocationCache = new WeakMap<AuctionResult, RedelegationAllocation>()

function allocateRedelegation(
  auctionResult: AuctionResult,
): RedelegationAllocation {
  const cached = allocationCache.get(auctionResult)
  if (cached) return cached
  const validators = auctionResult.auctionData.validators
  const budget = selectRedelegationBudget(auctionResult)
  const effectiveActive = (v: AuctionValidator) =>
    v.marinadeActivatedStakeSol - selectPaidUndelegationSol(v)
  const rawDelta = (v: AuctionValidator) =>
    v.auctionStake.marinadeSamTargetSol - effectiveActive(v)

  const sorted = [...validators].sort(
    (va, vb) => (vb.revShare.totalPmpe ?? 0) - (va.revShare.totalPmpe ?? 0),
  )
  const inflowByVote = new Map<string, number>()
  const rankByVote = new Map<string, number>()
  let priorityFrontierPmpe: number | null = null
  let marginalWinner: AuctionValidator | null = null
  let prevPmpe: number | null = null
  let groupRank = 0
  let remaining = budget
  sorted.forEach((v, i) => {
    const pmpe = v.revShare.totalPmpe ?? 0
    if (pmpe !== prevPmpe) {
      groupRank = i + 1
      prevPmpe = pmpe
    }
    rankByVote.set(v.voteAccount, groupRank)
    if (v.auctionStake.marinadeSamTargetSol > 0) {
      marginalWinner = v
    }
    if (budget > 0) {
      const delta = rawDelta(v)
      if (delta > 0 && remaining > 0) {
        const alloc = Math.min(delta, remaining)
        inflowByVote.set(
          v.voteAccount,
          (inflowByVote.get(v.voteAccount) ?? 0) + alloc,
        )
        remaining -= alloc
        if (alloc >= delta) {
          priorityFrontierPmpe = pmpe
        }
      }
    }
  })
  const result = {
    inflowByVote,
    priorityFrontierPmpe,
    rankByVote,
    marginalWinner,
  }
  allocationCache.set(auctionResult, result)
  return result
}

// paidUndelegation = SDK's paidUndelegationSol: scheduled undelegation outflow.
// Applied as a negative only when target < active — if target ≥ active the
// undelegation is absorbed by incoming redelegation and the net outflow is zero.
// Sub-min-bond validators lose all stake and are excluded from inflow/rotation.
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
    if (
      paid > 0 &&
      validator.auctionStake.marinadeSamTargetSol <
        validator.marinadeActivatedStakeSol
    ) {
      // Cap at active−target so the projected stake never undershoots target.
      const maxUndel =
        validator.marinadeActivatedStakeSol -
        validator.auctionStake.marinadeSamTargetSol
      const capped = Math.min(paid, maxUndel)
      const entry = get(validator.voteAccount)
      entry.paidUndelegation = -capped
      entry.total += -capped
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

// Memoised per AuctionResult identity. minBondBalanceSol comes from DsSamConfig
// (stable across the lifetime of a loaded auction), so reusing the prior
// computation when it matches avoids a per-render rebuild from sam-table.
const augmentCache = new WeakMap<
  AuctionResult,
  { minBondBalanceSol: number; result: AugmentedAuctionValidator[] }
>()

export function augmentAuctionResult(
  auctionResult: AuctionResult,
  minBondBalanceSol: number,
): AugmentedAuctionValidator[] {
  const cached = augmentCache.get(auctionResult)
  if (cached && cached.minBondBalanceSol === minBondBalanceSol)
    return cached.result
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
  const aboveRank = new Map<number, number>()
  for (let i = 0; i < above.length; i++) aboveRank.set(above[i], 1 + i)
  const belowRank = new Map<number, number>()
  below.forEach((p, i) => belowRank.set(p, -1 - i))
  const cutoffRanks = new Map<string, number>()
  for (const v of validators) {
    const p = v.revShare.totalPmpe
    const rank =
      Math.abs(p - win) < eps
        ? 0
        : p > win
          ? (aboveRank.get(p) ?? 0)
          : (belowRank.get(p) ?? 0)
    cutoffRanks.set(v.voteAccount, rank)
  }

  const result = validators.map(validator => {
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
      },
    }
  })
  augmentCache.set(auctionResult, { minBondBalanceSol, result })
  return result
}

export const selectExpectedStakeChange = (v: AuctionValidator): number =>
  (v as AugmentedAuctionValidator).values?.expectedStakeChangeSol ?? 0

export type ExpectedStakeChangeBreakdown = Omit<ExpectedStakeChange, 'total'>

export const selectExpectedStakeChangeBreakdown = (
  v: AugmentedAuctionValidator,
): ExpectedStakeChangeBreakdown => ({
  paidUndelegation: v.values.expectedStakePaidUndelegationSol,
  redelegationInflow: v.values.expectedStakeRedelegationInflowSol,
  naturalWithdrawal: v.values.expectedStakeNaturalWithdrawalSol,
})

export const selectCutoffRank = (v: AugmentedAuctionValidator): number =>
  v.values.cutoffRank

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
// the greedy pass uses. Ties share the higher position. This is the true
// delegation-priority rank, not the maxApy-derived sam-table rank; the
// greedy pass orders strictly on totalPmpe, so this is the rank that
// decides whether the budget reaches you before it runs dry.
export function selectRedelegationPriorityRank(
  v: AuctionValidator,
  auctionResult: AuctionResult,
): number | null {
  return (
    allocateRedelegation(auctionResult).rankByVote.get(v.voteAccount) ?? null
  )
}

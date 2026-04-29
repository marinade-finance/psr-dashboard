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
  AggregatedData,
  AuctionResult,
  AuctionValidator,
  AuctionConstraint,
  DsSamConfig,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'

type EpochsBundle = {
  epochsPerYear: number
  nameByVote: Map<string, string>
}

const fetchEpochsBundle = async (): Promise<EpochsBundle> => {
  const FETCHED_EPOCHS = 11
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
  const nameByVote = new Map<string, string>()
  for (const v of validators) {
    if (v.info_name) nameByVote.set(v.vote_account, v.info_name)
  }
  const epochStats = validators.map(({ epoch_stats }) => epoch_stats).flat()

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

  const SECONDS_PER_YEAR = 365.25 * 24 * 3600
  const DEFAULT_EPOCH_DURATION = 0.4 * 432000
  const DEFAULT_EPOCHS_PER_YEAR = SECONDS_PER_YEAR / DEFAULT_EPOCH_DURATION
  const rangeDuration = rangeEnd.timestamp - rangeStart.timestamp
  const rangeEpochs = rangeEnd.epoch - rangeStart.epoch + 1
  const epochsPerYear =
    !isFinite(rangeStart.epoch) || rangeEnd.epoch === 0
      ? DEFAULT_EPOCHS_PER_YEAR
      : SECONDS_PER_YEAR / (rangeDuration / rangeEpochs)

  return { epochsPerYear, nameByVote }
}

type SamResult = {
  auctionResult: AuctionResult
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  epochsPerYear: number
  dcSamConfig: DsSamConfig
  nameByVote: Map<string, string>
}

// DASHBOARD_BOND_OVERRIDE — remove this type when SDK ships a native
// bondBalanceSol override field on SourceDataOverrides.
export type DashboardOverrides = SourceDataOverrides & {
  bondTopUpSol?: Map<string, number>
}

export const loadSam = async (
  dataOverrides?: DashboardOverrides | null,
): Promise<SamResult> => {
  const { epochsPerYear, nameByVote } = await fetchEpochsBundle()
  console.log('epochsPerYear', epochsPerYear)
  const config = await loadSamConfig()
  const dsSam = new DsSamSDK({
    ...config,
    inputsSource: InputsSource.APIS,
    cacheInputs: false,
    debugVoteAccounts: [],
    logVerbosity: LogVerbosity.ERROR,
  })

  const bondTopUps = dataOverrides?.bondTopUpSol
  const sdkOverrides: SourceDataOverrides | null | undefined = dataOverrides
    ? {
        inflationCommissionsDec: dataOverrides.inflationCommissionsDec,
        mevCommissionsDec: dataOverrides.mevCommissionsDec,
        blockRewardsCommissionsDec: dataOverrides.blockRewardsCommissionsDec,
        cpmpesDec: dataOverrides.cpmpesDec,
      }
    : dataOverrides

  const auctionResult =
    bondTopUps && bondTopUps.size > 0
      ? await runWithBondTopUp(dsSam, sdkOverrides, bondTopUps)
      : await dsSam.runFinalOnly(sdkOverrides)

  const runAlt = async (mutate: (data: AggregatedData) => void) => {
    const aggregatedData = await dsSam.getAggregatedData(sdkOverrides)
    mutate(aggregatedData)
    const debug = new Debug(new Set(), LogVerbosity.ERROR)
    const constraints = dsSam.getAuctionConstraints(aggregatedData, debug)
    const validators = dsSam.transformValidators(aggregatedData)
    const data = { ...aggregatedData, validators }
    return new Auction(data, constraints, dsSam.config, debug).evaluate()
  }

  // +10% / -10% TVL sensitivity
  const joinResult = await runAlt((data: AggregatedData) => {
    // eslint-disable-next-line no-param-reassign
    data.stakeAmounts.marinadeSamTvlSol *= 1.1
    // eslint-disable-next-line no-param-reassign
    data.stakeAmounts.marinadeRemainingSamSol *= 1.1
  })
  const tvlJoinApyDiff = selectTvlApyDiff(
    auctionResult,
    joinResult,
    epochsPerYear,
  )

  const leaveResult = await runAlt((data: AggregatedData) => {
    // eslint-disable-next-line no-param-reassign
    data.stakeAmounts.marinadeSamTvlSol *= 0.9
    // eslint-disable-next-line no-param-reassign
    data.stakeAmounts.marinadeRemainingSamSol *= 0.9
  })
  const tvlLeaveApyDiff = selectTvlApyDiff(
    auctionResult,
    leaveResult,
    epochsPerYear,
  )

  // Backstop: block top 5 validators by target stake
  const top5 = auctionResult.auctionData.validators
    .slice()
    .sort(
      (a, b) =>
        b.auctionStake.marinadeSamTargetSol -
        a.auctionStake.marinadeSamTargetSol,
    )
    .slice(0, 5)
    .map(validator => ({
      voteAccount: validator.voteAccount,
      targetStake: validator.auctionStake.marinadeSamTargetSol,
    }))

  const top5Accounts = new Set(top5.map(t => t.voteAccount))
  const backstopResult = await runAlt(data => {
    // eslint-disable-next-line no-param-reassign
    data.validators = data.validators.filter(
      v => !top5Accounts.has(v.voteAccount),
    )
  })
  const backstopDiff = selectTargetApyDiff(
    auctionResult,
    backstopResult,
    epochsPerYear,
  )
  const backstopTvl = top5.reduce((sum, t) => sum + t.targetStake, 0)

  return {
    auctionResult,
    tvlJoinApyDiff,
    tvlLeaveApyDiff,
    backstopDiff,
    backstopTvl,
    epochsPerYear,
    dcSamConfig: dsSam.config,
    nameByVote,
  }
}

// DASHBOARD_BOND_OVERRIDE — remove this block when SDK ships a native
// bondBalanceSol override field on SourceDataOverrides.
async function runWithBondTopUp(
  dsSam: DsSamSDK,
  sdkOverrides: SourceDataOverrides | null | undefined,
  bondTopUps: Map<string, number>,
): Promise<AuctionResult> {
  const aggregatedData = await dsSam.getAggregatedData(sdkOverrides)
  for (const v of aggregatedData.validators) {
    const delta = bondTopUps.get(v.voteAccount)
    if (delta === undefined) continue
    if (v.bondBalanceSol != null) {
      v.bondBalanceSol = Math.max(0, v.bondBalanceSol + delta)
    }
    if (v.claimableBondBalanceSol != null) {
      v.claimableBondBalanceSol = Math.max(0, v.claimableBondBalanceSol + delta)
    }
  }
  const debug = new Debug(new Set(), LogVerbosity.ERROR)
  const constraints = dsSam.getAuctionConstraints(aggregatedData, debug)
  const validators = dsSam.transformValidators(aggregatedData)
  const data = { ...aggregatedData, validators }
  return new Auction(data, constraints, dsSam.config, debug).evaluate()
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

export const selectIdealAPY = (
  auctionResult: AuctionResult,
  epochsPerYear: number,
) => {
  const vs = auctionResult.auctionData.validators
  const profit = selectActiveProfit(vs)
  const activeStake = vs.reduce(
    (acc, v) => acc + v.marinadeActivatedStakeSol,
    0,
  )
  return activeStake > 0
    ? Math.pow(1 + profit / activeStake, epochsPerYear) - 1
    : 0
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
      selectIsNonProductive(entry)
        ? acc
        : acc + entry.marinadeActivatedStakeSol,
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
): string =>
  formatPercentage(
    validator.values?.commissions?.inflationCommissionOnchainDec ??
      selectCommission(validator),
    0,
  )

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

export const selectBondHealth = (validator: AuctionValidator) =>
  validator.bondGoodForNEpochs

export const selectMaxAPY = (
  validator: AuctionValidator,
  epochsPerYear: number,
) => Math.pow(1 + validator.revShare.totalPmpe / 1e3, epochsPerYear) - 1

export const selectEffectiveBid = (validator: AuctionValidator) =>
  validator.revShare.auctionEffectiveBidPmpe

export const selectEffectiveCost = (validator: AuctionValidator) =>
  (validator.marinadeActivatedStakeSol / 1000) *
  validator.revShare.auctionEffectiveBidPmpe

export const bondHealthColor = (
  validator: AuctionValidator,
): Color | undefined => {
  if (!validator.auctionStake.marinadeSamTargetSol) {
    return undefined
  }
  const health = selectBondHealth(validator)
  if (health >= 13) {
    return Color.GREEN
  }
  if (health >= 6) {
    return Color.YELLOW
  }
  if (health >= 2) {
    return Color.ORANGE
  }
  return Color.RED
}

export const bondTooltip = (color: Color) => {
  switch (color) {
    case Color.RED:
      return 'Bond coverage critically low — undelegation imminent. Top up immediately.'
    case Color.ORANGE:
      return 'Bond coverage low — top up soon to avoid bond risk fee charges.'
    case Color.YELLOW:
      return 'Bond coverage moderate — top up to increase stake capacity.'
    case Color.GREEN:
      return 'Bond coverage healthy — bond is not limiting your stake.'
    default:
      return ''
  }
}

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

export const selectTargetApyDiff = (
  baseResult: AuctionResult,
  altResult: AuctionResult,
  epochsPerYear: number,
): number => {
  const targetProfit = (r: AuctionResult) =>
    r.auctionData.validators.reduce(
      (acc, v) =>
        acc + (totalProfitPmpe(v) * v.auctionStake.marinadeSamTargetSol) / 1000,
      0,
    )
  const tvl = baseResult.auctionData.stakeAmounts.marinadeSamTvlSol
  const apy = (r: AuctionResult) =>
    Math.pow(1 + targetProfit(r) / tvl, epochsPerYear) - 1
  return apy(altResult) - apy(baseResult)
}

export const selectTvlApyDiff = (
  baseResult: AuctionResult,
  altResult: AuctionResult,
  epochsPerYear: number,
): number => {
  const apy = (r: AuctionResult) => {
    const tvl = r.auctionData.stakeAmounts.marinadeSamTvlSol
    return (
      Math.pow(
        1 + selectActiveProfit(r.auctionData.validators) / tvl,
        epochsPerYear,
      ) - 1
    )
  }
  return apy(altResult) - apy(baseResult)
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

// -----------------------------------------------------------------------------
// AUCTION RESULT AUGMENTATION
// -----------------------------------------------------------------------------
// Additional per-validator values computed on top of the SDK's auction result
// and stitched back into it. Planned migration: move this whole block into
// ds-sam-sdk so the fields ship as part of AuctionValidatorValues. Until then,
// this module owns the math and exposes an `augmentAuctionResult` entry point.
//
// Per-epoch natural undelegation outflow: ~0.7% of TVL is withdrawn from the
// pool each epoch and must be drawn pro-rata from currently-staked validators.
// Paid undelegation (values.paidUndelegationSol) is charged additionally and
// does NOT count against the 0.7% TVL cap.
const WITHDRAWAL_FRACTION_PER_EPOCH = 0.007

export type AugmentedValues = AuctionValidator['values'] & {
  expectedStakeChangeSol: number
}

export type AugmentedAuctionValidator = Omit<AuctionValidator, 'values'> & {
  values: AugmentedValues
}

export function augmentAuctionResult(
  auctionResult: AuctionResult,
): AugmentedAuctionValidator[] {
  const { validators } = auctionResult.auctionData
  const changes = computeExpectedStakeChanges(auctionResult)
  for (const v of validators) {
    const values = v.values as AugmentedValues
    values.expectedStakeChangeSol = changes.get(v.voteAccount) ?? 0
  }
  return validators as AugmentedAuctionValidator[]
}

function computeNaturalWithdrawal(
  validators: AuctionValidator[],
  tvl: number,
): Map<string, number> {
  const out = new Map<string, number>()
  const withdrawal = WITHDRAWAL_FRACTION_PER_EPOCH * tvl
  if (withdrawal <= 0) return out
  // Prefer pulling from over-target validators (rebalancer withdraws from
  // excess first), pro-rata by excess. Fall back to pro-rata by active stake
  // across all validators if nobody is over-target.
  const excess = validators.map(v => ({
    va: v.voteAccount,
    x: Math.max(
      0,
      v.marinadeActivatedStakeSol - v.auctionStake.marinadeSamTargetSol,
    ),
  }))
  const totalExcess = excess.reduce((s, e) => s + e.x, 0)
  if (totalExcess > 0) {
    for (const { va, x } of excess) {
      if (x > 0) out.set(va, (withdrawal * x) / totalExcess)
    }
    return out
  }
  const totalActive = validators.reduce(
    (s, v) => s + v.marinadeActivatedStakeSol,
    0,
  )
  if (totalActive <= 0) return out
  for (const v of validators) {
    out.set(
      v.voteAccount,
      (withdrawal * v.marinadeActivatedStakeSol) / totalActive,
    )
  }
  return out
}

// Budget = already-liquid reserve (TVL − Σactive); below-target winners get
// inflows greedily by totalPmpe. Outflows: natural withdrawal (~0.7% TVL)
// + paid undelegation, the latter clamped to max(0, active − target) since
// only the over-target portion can actually leave (the rest is held by the
// auction target).
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

export const selectExpectedStakeChange = (
  v: AugmentedAuctionValidator,
): number => v.values.expectedStakeChangeSol ?? 0

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
  ) => {
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

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

const estimateEpochsPerYear = async () => {
  const FETCHED_EPOCHS = 11
  const { validators } = await fetchValidatorsWithEpochs(FETCHED_EPOCHS)
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
  if (!isFinite(rangeStart.epoch) || rangeEnd.epoch === 0) {
    return DEFAULT_EPOCHS_PER_YEAR
  }

  return SECONDS_PER_YEAR / (rangeDuration / rangeEpochs)
}

type SamResult = {
  auctionResult: AuctionResult
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  epochsPerYear: number
  dcSamConfig: DsSamConfig
}

export const loadSam = async (
  dataOverrides?: SourceDataOverrides | null,
): Promise<SamResult> => {
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

  const auctionResult = await dsSam.runFinalOnly(dataOverrides)

  const runAlt = async (mutate: (data: AggregatedData) => void) => {
    const aggregatedData = await dsSam.getAggregatedData(dataOverrides)
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
      !selectIsNonProductive(entry)
        ? acc + entry.marinadeActivatedStakeSol
        : acc,
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

// Budget for next-epoch re-delegation: stake that cooled down from the
// previous epoch to the current snapshot becomes free to re-stake next epoch.
export function selectRedelegationBudget(
  validators: AuctionValidator[],
): number {
  let budget = 0
  for (const v of validators) {
    const last = v.lastMarinadeActivatedStakeSol
    if (last == null) continue
    const delta = last - v.marinadeActivatedStakeSol
    if (delta > 0) budget += delta
  }
  return budget
}

// Per-epoch natural undelegation outflow: ~0.7% of TVL is withdrawn from the
// pool each epoch and must be drawn pro-rata from currently-staked validators.
const WITHDRAWAL_FRACTION_PER_EPOCH = 0.007

// Expected per-validator stake change next epoch. Combines:
//  - Re-delegation budget (stake that just cooled down) → inflows go greedily
//    to the highest-totalPmpe validators whose target is above current;
//    a matching amount is drawn from validators above target, pro-rata by excess.
//  - Natural withdrawals (~0.7% of TVL) → drawn from every validator holding
//    SAM stake, pro-rata by their current activated SAM stake.
export function buildExpectedStakeChanges(
  validators: AuctionValidator[],
  tvl: number,
): Map<string, number> {
  const budget = selectRedelegationBudget(validators)
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
    const totalInflows = [...result.values()].reduce((s, x) => s + x, 0)
    const losers = validators.filter(v => rawDelta(v) < 0)
    const totalExcess = losers.reduce((s, v) => s + Math.abs(rawDelta(v)), 0)
    if (totalInflows > 0 && totalExcess > 0) {
      for (const v of losers) {
        const share = Math.abs(rawDelta(v)) / totalExcess
        result.set(v.voteAccount, -totalInflows * share)
      }
    }
  }

  const withdrawal = WITHDRAWAL_FRACTION_PER_EPOCH * tvl
  if (withdrawal > 0) {
    const totalActive = validators.reduce(
      (s, v) => s + v.marinadeActivatedStakeSol,
      0,
    )
    if (totalActive > 0) {
      for (const v of validators) {
        const share = v.marinadeActivatedStakeSol / totalActive
        const prev = result.get(v.voteAccount) ?? 0
        result.set(v.voteAccount, prev - withdrawal * share)
      }
    }
  }

  // Paid undelegation: bond-funded penalties (bid-too-low, blacklist, bond
  // risk fee). Charged per validator, independent of the TVL withdrawal cap.
  for (const v of validators) {
    const stake = v.marinadeActivatedStakeSol
    const penalty =
      (stake * (v.revShare.bidTooLowPenaltyPmpe ?? 0)) / 1000 +
      (stake * (v.revShare.blacklistPenaltyPmpe ?? 0)) / 1000 +
      (v.values?.bondRiskFeeSol ?? 0)
    if (penalty > 0) {
      const prev = result.get(v.voteAccount) ?? 0
      result.set(v.voteAccount, prev - penalty)
    }
  }

  return result
}

export const selectExpectedStakeChange = (
  voteAccount: string,
  stakeChanges: Map<string, number>,
): number => stakeChanges.get(voteAccount) ?? 0

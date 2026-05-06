import { finite, formatPercentage } from 'src/format'
import {
  formattedBlockRewardsCommission,
  formattedMevCommission,
  overridesCpmpeMessage,
  selectBid,
  selectBlockRewardsCommissionPmpe,
  selectCommission,
  selectCommissionPmpe,
  selectEffectiveBid,
  selectEffectiveCost,
  selectExpectedStakeChange,
  selectMevCommissionPmpe,
  selectSamActiveStake,
  selectSamTargetStake,
} from 'src/services/sam'
import { Color } from 'src/services/types'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { AugmentedAuctionValidator } from 'src/services/sam'

// SDK calculations.js:117-118 (calcBidTooLowPenalty) — ideally exported from SDK.
const TOL_COEF = 0.99999
const SCALE_COEF = 1.5

export type SamRevenueMetrics = {
  active: number
  target: number
  delta: number
  effBid: number
  bid: number
  stake: number
  activating: number
  cost: number
  activatingCost: number
  total: number
  inflPct: string
  mevPct: string
  blkPct: string
  inflPmpe: number
  mevPmpe: number
  blkPmpe: number
  overrideMsg: string
}

export function computeSamRevenueMetrics(
  v: AugmentedAuctionValidator,
): SamRevenueMetrics {
  const stake = v.marinadeActivatedStakeSol
  const delta = selectExpectedStakeChange(v)
  const activating = Math.max(0, delta)
  const bid = selectBid(v)
  const cost = selectEffectiveCost(v)
  const activatingCost = (v.revShare.activatingStakePmpe * activating) / 1000
  return {
    active: selectSamActiveStake(v),
    target: selectSamTargetStake(v),
    delta,
    effBid: selectEffectiveBid(v),
    bid,
    stake,
    activating,
    cost,
    activatingCost,
    total: cost + activatingCost,
    inflPct: formatPercentage(selectCommission(v), 0),
    mevPct: formattedMevCommission(v),
    blkPct: formattedBlockRewardsCommission(v),
    inflPmpe: selectCommissionPmpe(v),
    mevPmpe: selectMevCommissionPmpe(v),
    blkPmpe: selectBlockRewardsCommissionPmpe(v),
    overrideMsg: overridesCpmpeMessage(v),
  }
}

export type BondCoverageMetrics = {
  minEp: number
  idealEp: number
  bondBalanceSol: number
  claimableBondBalanceSol: number
  marinadeActivatedStakeSol: number
  expectedMaxEffBidPmpe: number
  onchainDistributedPmpe: number
  projectedExposedStakeSol: number
  minUnprotectedReserveSol: number
  idealUnprotectedReserveSol: number
  onchainBase: number
  minCoverageBid: number
  floorBase: number
  topUpToMin: number
  idealCoverageBid: number
  requiredIdeal: number
  topUpToIdeal: number
}

export function computeBondCoverageMetrics(
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
): BondCoverageMetrics {
  const bondBalanceSol = v.bondBalanceSol ?? 0
  const claimableBondBalanceSol = v.claimableBondBalanceSol ?? 0
  const marinadeActivatedStakeSol = v.marinadeActivatedStakeSol
  const paidUndelegationSol = v.values?.paidUndelegationSol ?? 0
  const expectedMaxEffBidPmpe = finite(v.revShare?.expectedMaxEffBidPmpe)
  const onchainDistributedPmpe = finite(v.revShare?.onchainDistributedPmpe)
  const unprotectedStakeSol = v.unprotectedStakeSol ?? 0

  // Strip this cycle's freshly-charged undelegation so the projection isn't
  // implicitly re-charging on the already-penalized base. Bond-risk fresh
  // contribution to paidUndelegationSol is min(1, mult) * value (SDK
  // calculations.js:94).
  const freshBondRiskUndel =
    (v.bondForcedUndelegation?.value ?? 0) * Math.min(1, bondRiskFeeMult)
  const freshBidTooLowUndel =
    winningTotalPmpe > 0
      ? ((v.revShare?.bidTooLowPenaltyPmpe ?? 0) * marinadeActivatedStakeSol) /
        winningTotalPmpe
      : 0
  const carriedPaidUndelegationSol = Math.max(
    0,
    paidUndelegationSol - freshBondRiskUndel - freshBidTooLowUndel,
  )

  const projectedActivatedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - carriedPaidUndelegationSol,
  )
  const projectedExposedStakeSol = Math.max(
    0,
    projectedActivatedStakeSol - unprotectedStakeSol,
  )

  const minUnprotectedReserveSol = finite(v.minUnprotectedReserve)
  const idealUnprotectedReserveSol = finite(v.idealUnprotectedReserve)

  const minEp = 1 + minBondEpochs
  const idealEp = 1 + idealBondEpochs

  const minBondPmpe = finite(v.minBondPmpe)
  const idealBondPmpe = finite(v.idealBondPmpe)

  const onchainBase = (onchainDistributedPmpe / 1000) * projectedExposedStakeSol
  const minCoverageBid =
    ((minEp * expectedMaxEffBidPmpe) / 1000) * projectedExposedStakeSol
  // floorBase mirrors SDK fee trigger threshold:
  //   claimableBond >= minUnprotectedReserve + projectedExposed * minBondPmpe/1000
  const floorBase =
    minUnprotectedReserveSol + (minBondPmpe / 1000) * projectedExposedStakeSol
  const topUpToMin = Math.max(0, floorBase - claimableBondBalanceSol)

  const idealCoverageBid =
    ((idealEp * expectedMaxEffBidPmpe) / 1000) * projectedExposedStakeSol
  const requiredIdeal =
    idealUnprotectedReserveSol +
    (idealBondPmpe / 1000) * projectedExposedStakeSol
  const topUpToIdeal = Math.max(0, requiredIdeal - bondBalanceSol)

  return {
    minEp,
    idealEp,
    bondBalanceSol,
    claimableBondBalanceSol,
    marinadeActivatedStakeSol,
    expectedMaxEffBidPmpe,
    onchainDistributedPmpe,
    projectedExposedStakeSol,
    minUnprotectedReserveSol,
    idealUnprotectedReserveSol,
    onchainBase,
    minCoverageBid,
    floorBase,
    topUpToMin,
    idealCoverageBid,
    requiredIdeal,
    topUpToIdeal,
  }
}

export function penaltyRiskColor(
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
): Color | undefined {
  if (!v.auctionStake.marinadeSamTargetSol && !v.marinadeActivatedStakeSol) {
    return undefined
  }
  const m = computeBondCoverageMetrics(
    v,
    minBondEpochs,
    idealBondEpochs,
    winningTotalPmpe,
    bondRiskFeeMult,
  )
  if (m.topUpToMin > 0) return Color.RED
  if (m.topUpToIdeal > 0) return Color.YELLOW
  return Color.GREEN
}

export type BondHealthState = 'healthy' | 'watch' | 'critical'

export function bondHealthFromAuction(
  v: AuctionValidator,
  config: DsSamConfig,
  winningTotalPmpe: number,
): BondHealthState {
  const c = penaltyRiskColor(
    v,
    config.minBondEpochs,
    config.idealBondEpochs,
    winningTotalPmpe,
    config.bondRiskFeeMult,
  )
  if (c === Color.RED) return 'critical'
  if (c === Color.YELLOW) return 'watch'
  return 'healthy'
}

export type BidPenaltyMetrics = {
  historyEpochs: number
  lastEpochBidPmpe: number
  thisEpochBidPmpe: number
  isNegativeBiddingChange: boolean
  effParticipatingBidPmpe: number
  worstHistoricalPmpe: number
  limit: number
  adjustedLimit: number
  bondObligationPmpe: number
  shortfall: number
  penaltyCoef: number
  base: number
  penaltyPmpe: number
  marinadeActivatedStakeSol: number
  winningTotalPmpe: number
}

export function computeBidPenaltyMetrics(
  v: AuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): BidPenaltyMetrics {
  const historyEpochs = dsSamConfig.bidTooLowPenaltyHistoryEpochs
  // SDK auction.js:202 passes this field as permittedBidDeviation ∈ [0,1].
  const permittedDeviation = dsSamConfig.bidTooLowPenaltyPermittedDeviationPmpe

  const auctions = v.auctions ?? []
  const pastAuction = auctions[0]
  const lastEpochBidPmpe = finite(pastAuction?.bidPmpe)
  const thisEpochBidPmpe = finite(v.revShare?.bidPmpe)
  const threshold = TOL_COEF * lastEpochBidPmpe
  const isNegativeBiddingChange = thisEpochBidPmpe < threshold

  const effParticipatingBidPmpe = finite(v.revShare?.effParticipatingBidPmpe)
  // SDK calculations.js:121-123 — uses ?? not ||, so 0 stays 0.
  const worstHistoricalPmpe = auctions
    .slice(0, historyEpochs)
    .reduce(
      (acc, a) => Math.min(acc, a.effParticipatingBidPmpe ?? Infinity),
      Infinity,
    )
  const limit = Math.min(effParticipatingBidPmpe, worstHistoricalPmpe)
  const adjustedLimit = limit * (1 - permittedDeviation)

  const bondObligationPmpe = finite(v.revShare?.bondObligationPmpe)
  const shortfall = Math.max(0, adjustedLimit - bondObligationPmpe)
  const shortfallRatio = adjustedLimit > 0 ? shortfall / adjustedLimit : 0
  const rawCoef =
    adjustedLimit > 0 ? Math.min(1, Math.sqrt(SCALE_COEF * shortfallRatio)) : 0
  const penaltyCoef = isNegativeBiddingChange ? rawCoef : 0

  const base = winningTotalPmpe + effParticipatingBidPmpe
  const penaltyPmpe = penaltyCoef * base

  return {
    historyEpochs,
    lastEpochBidPmpe,
    thisEpochBidPmpe,
    isNegativeBiddingChange,
    effParticipatingBidPmpe,
    worstHistoricalPmpe: Number.isFinite(worstHistoricalPmpe)
      ? worstHistoricalPmpe
      : 0,
    limit,
    adjustedLimit,
    bondObligationPmpe,
    shortfall,
    penaltyCoef,
    base,
    penaltyPmpe,
    marinadeActivatedStakeSol: v.marinadeActivatedStakeSol,
    winningTotalPmpe,
  }
}

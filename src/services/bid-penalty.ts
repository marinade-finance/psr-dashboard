import { finite } from 'src/format'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// SDK calculations.js:117-118 (calcBidTooLowPenalty) — ideally exported from SDK.
const TOL_COEF = 0.99999
const SCALE_COEF = 1.5

export type BidPenalty = {
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
  penaltySol: number
  marinadeActivatedStakeSol: number
  winningTotalPmpe: number
}

export function computeBidPenalty(
  v: AuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): BidPenalty {
  const historyEpochs = dsSamConfig.bidTooLowPenaltyHistoryEpochs
  // SDK auction.js:202 passes this field as permittedBidDeviation ∈ [0,1].
  // Falls back to 0 if missing — the SDK's `calcBidTooLowPenalty` defaults
  // the same way; without this, `1 - undefined` poisons every downstream
  // value with NaN (badge, banner, payments row).
  const permittedDeviation =
    dsSamConfig.bidTooLowPenaltyPermittedDeviationPmpe ?? 0

  const auctions = v.auctions ?? []
  const pastAuction = auctions[0]
  const lastEpochBidPmpe = finite(pastAuction?.bidPmpe)
  const thisEpochBidPmpe = finite(v.revShare.bidPmpe)
  const threshold = TOL_COEF * lastEpochBidPmpe
  const isNegativeBiddingChange = thisEpochBidPmpe < threshold

  const effParticipatingBidPmpe = finite(v.revShare.effParticipatingBidPmpe)
  // SDK calculations.js:121-123 — uses ?? not ||, so 0 stays 0.
  const worstHistoricalPmpe = auctions
    .slice(0, historyEpochs)
    .reduce(
      (acc, a) => Math.min(acc, a.effParticipatingBidPmpe ?? Infinity),
      Infinity,
    )
  const limit = Math.min(effParticipatingBidPmpe, worstHistoricalPmpe)
  const adjustedLimit = limit * (1 - permittedDeviation)

  const bondObligationPmpe = finite(v.revShare.bondObligationPmpe)
  const shortfall = Math.max(0, adjustedLimit - bondObligationPmpe)
  const shortfallRatio = adjustedLimit > 0 ? shortfall / adjustedLimit : 0
  const rawCoef =
    adjustedLimit > 0 ? Math.min(1, Math.sqrt(SCALE_COEF * shortfallRatio)) : 0
  const penaltyCoef = isNegativeBiddingChange ? rawCoef : 0

  const base = winningTotalPmpe + effParticipatingBidPmpe
  const penaltyPmpe = penaltyCoef * base
  const penaltySol = (penaltyPmpe / 1000) * v.marinadeActivatedStakeSol

  return {
    historyEpochs,
    lastEpochBidPmpe,
    thisEpochBidPmpe,
    isNegativeBiddingChange,
    effParticipatingBidPmpe,
    // With no history `worstHistoricalPmpe` stays `Infinity` and `limit`
    // collapses to `effParticipatingBidPmpe` (the min(eff, ∞) above). Mirror
    // that on the displayed value so the breakdown's "Historical bid limit"
    // row doesn't read 0 while the math actually used the eff bid.
    worstHistoricalPmpe: Number.isFinite(worstHistoricalPmpe)
      ? worstHistoricalPmpe
      : effParticipatingBidPmpe,
    limit,
    adjustedLimit,
    bondObligationPmpe,
    shortfall,
    penaltyCoef,
    base,
    penaltyPmpe,
    penaltySol,
    marinadeActivatedStakeSol: v.marinadeActivatedStakeSol,
    winningTotalPmpe,
  }
}

// A pmpe penalty rate applied to a stake base: lamports-per-1000-stake → SOL.
// Pure: stake basis is the caller's choice. validator-with-protected_event.ts
// keeps its own API-epochStats base; the auction surfaces pass active stake.
export function penaltyPmpeToSol(pmpe: number, stakeSol: number): number {
  return (pmpe / 1000) * stakeSol
}

// Single home for the bid-too-low penalty in SOL. Sources from the local
// computeBidPenalty recompute (NOT the SDK-pre-computed
// `revShare.bidTooLowPenaltyPmpe`) so that under simulation — where the SDK
// field is frozen against the original commission/bid — the displayed
// penalty updates with the user's edits. Every surface (tip banner, sam-
// table badge, validator-detail header, Payments breakdown row, Bid Penalty
// breakdown headline) consumes THIS value, so they can never contradict
// each other.
export function bidTooLowPenaltySol(
  v: AuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): number {
  return computeBidPenalty(v, dsSamConfig, winningTotalPmpe).penaltySol
}

// Blacklist penalty in SOL against the validator's active Marinade stake.
export function blacklistPenaltySol(v: AuctionValidator): number {
  return penaltyPmpeToSol(
    v.revShare.blacklistPenaltyPmpe,
    v.marinadeActivatedStakeSol,
  )
}

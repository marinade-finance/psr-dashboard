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
  const penaltySol = (penaltyPmpe / 1000) * v.marinadeActivatedStakeSol

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

// Single home for the bid-too-low penalty in SOL. Uses the SDK-pre-computed
// `revShare.bidTooLowPenaltyPmpe` (authoritative) projected onto active stake,
// NOT `computeBidPenalty().penaltySol`: the local recompute requires a model
// of negative bid change via the auctions history, which synthetic fixtures
// and some live edges don't satisfy — they diverge to 0 while the SDK truth
// is non-zero. CTA/table badge/detail panel all consume this.
export function bidTooLowPenaltySol(v: AuctionValidator): number {
  return penaltyPmpeToSol(
    v.revShare?.bidTooLowPenaltyPmpe ?? 0,
    v.marinadeActivatedStakeSol,
  )
}

// Blacklist penalty in SOL against the validator's active Marinade stake.
export function blacklistPenaltySol(v: AuctionValidator): number {
  return penaltyPmpeToSol(
    v.revShare.blacklistPenaltyPmpe,
    v.marinadeActivatedStakeSol,
  )
}

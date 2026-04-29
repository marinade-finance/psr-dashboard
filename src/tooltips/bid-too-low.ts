import { Color } from 'src/components/table/table'
import {
  ctaBlock,
  divider,
  okRow,
  row,
  sectionHeader,
  wrapTable,
} from 'src/components/tooltip-table/tooltip-table'
import { formatSolAmount } from 'src/format'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Mirrors SDK ds-sam-sdk/dist/src/calculations.js:117-118 (calcBidTooLowPenalty).
// TODO ... export these from the SDK and use these verbatim.
const TOL_COEF = 0.99999
const SCALE_COEF = 1.5

const pmpe = (x: number) => x.toFixed(5)
const stake = (n: number) => `${formatSolAmount(n, 0)} ☉`
const finite = (x: number | null | undefined): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : 0

export type BidTooLowMetrics = {
  historyEpochs: number
  permittedDeviation: number
  lastEpochBidPmpe: number
  thisEpochBidPmpe: number
  threshold: number
  isNegativeBiddingChange: boolean
  effParticipatingBidPmpe: number
  worstHistoricalPmpe: number
  limit: number
  adjustedLimit: number
  bondObligationPmpe: number
  shortfall: number
  shortfallRatio: number
  penaltyCoef: number
  base: number
  penaltyPmpe: number
  marinadeActivatedStakeSol: number
  winningTotalPmpe: number
  forcedUndelegationSol: number
}

export const computeBidTooLowMetrics = (
  v: AuctionValidator,
  dcSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): BidTooLowMetrics => {
  const historyEpochs = dcSamConfig.bidTooLowPenaltyHistoryEpochs
  // SDK auction.js:202 passes this field as permittedBidDeviation ∈ [0,1].
  const permittedDeviation = dcSamConfig.bidTooLowPenaltyPermittedDeviationPmpe

  const auctions = v.auctions ?? []
  const pastAuction = auctions[0]
  const lastEpochBidPmpe = finite(pastAuction?.bidPmpe)
  const thisEpochBidPmpe = finite(v.revShare?.bidPmpe)
  const threshold = TOL_COEF * lastEpochBidPmpe
  const isNegativeBiddingChange = thisEpochBidPmpe < threshold

  const effParticipatingBidPmpe = finite(v.revShare?.effParticipatingBidPmpe)
  // Mirrors SDK calculations.js:121-123 — uses ?? not ||, so 0 stays 0.
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

  const marinadeActivatedStakeSol = v.marinadeActivatedStakeSol
  const forcedUndelegationSol =
    penaltyPmpe > 0 && winningTotalPmpe > 0
      ? (penaltyPmpe * marinadeActivatedStakeSol) / winningTotalPmpe
      : 0

  return {
    historyEpochs,
    permittedDeviation,
    lastEpochBidPmpe,
    thisEpochBidPmpe,
    threshold,
    isNegativeBiddingChange,
    effParticipatingBidPmpe,
    worstHistoricalPmpe: Number.isFinite(worstHistoricalPmpe)
      ? worstHistoricalPmpe
      : 0,
    limit,
    adjustedLimit,
    bondObligationPmpe,
    shortfall,
    shortfallRatio,
    penaltyCoef,
    base,
    penaltyPmpe,
    marinadeActivatedStakeSol,
    winningTotalPmpe,
    forcedUndelegationSol,
  }
}

export const renderBidTooLowTooltip = (m: BidTooLowMetrics): string => {
  const hasPenalty = m.penaltyPmpe > 0
  const ctaLabel = 'Bid-Too-Low Penalty Breakdown'
  let cta: string
  if (!m.isNegativeBiddingChange) {
    cta = ctaBlock({
      label: ctaLabel,
      cta: 'No bid-too-low penalty: bid not reduced this epoch.',
      state: Color.GREEN,
    })
  } else if (m.shortfall === 0) {
    cta = ctaBlock({
      label: ctaLabel,
      cta: 'No bid-too-low penalty: bid kept high enough.',
      state: Color.GREEN,
    })
  } else {
    cta = ctaBlock({
      label: ctaLabel,
      cta:
        `Bid-too-low penalty applies. Forced undelegation: ${stake(m.forcedUndelegationSol)}. ` +
        `Raise effective bid by ≥ ${pmpe(m.shortfall)} PMPE to clear it.`,
      state: Color.RED,
    })
  }

  const direction =
    sectionHeader('Bid Direction') +
    row('Last epoch bid', '', pmpe(m.lastEpochBidPmpe)) +
    row('This epoch bid', '', pmpe(m.thisEpochBidPmpe)) +
    (m.isNegativeBiddingChange
      ? row('Status', '', 'Bid reduced', { boldValue: true, accent: 'red' })
      : okRow('Bid not reduced'))

  const limitSection =
    sectionHeader('Participation Limit') +
    row('Current eff. participating bid', '', pmpe(m.effParticipatingBidPmpe)) +
    row(
      `Lowest historical bid (last ${m.historyEpochs} epochs)`,
      '',
      pmpe(m.worstHistoricalPmpe),
    ) +
    divider() +
    row('Safe bid floor', '', pmpe(m.limit), { boldValue: true }) +
    (hasPenalty
      ? row('', '', `Raise bid to ≥ ${pmpe(m.limit)} PMPE to avoid penalty.`, {
          boldValue: true,
          accent: 'red',
        })
      : okRow(
          `You may reduce bid down to ${pmpe(m.limit)} PMPE without penalty.`,
        ))

  const cushion =
    sectionHeader('Cushion Check') +
    row('Bond obligation', '', pmpe(m.bondObligationPmpe)) +
    row('Adjusted limit', '', pmpe(m.adjustedLimit)) +
    divider() +
    row('Penalty coef', '', m.penaltyCoef.toFixed(4), { boldValue: true })

  const baseSection =
    sectionHeader('Penalty Base') +
    row('Winning total PMPE', '', pmpe(m.winningTotalPmpe)) +
    row('Eff. participating bid PMPE', '', pmpe(m.effParticipatingBidPmpe)) +
    divider() +
    row('Penalty base (sum of the above)', '', pmpe(m.base), {
      boldValue: true,
    })

  const result =
    sectionHeader('Penalty Result') +
    row('Activated Marinade stake', stake(m.marinadeActivatedStakeSol), '') +
    divider() +
    row('Penalty PMPE', '', pmpe(m.penaltyPmpe), { boldValue: true }) +
    (hasPenalty
      ? row('Forced undelegation', '', stake(m.forcedUndelegationSol), {
          boldValue: true,
          accent: 'red',
        })
      : okRow('No penalty this epoch.'))

  return (
    cta + wrapTable(direction + limitSection + cushion + baseSection + result)
  )
}

export const buildBidTooLowTooltip = (
  v: AuctionValidator,
  dcSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): string =>
  renderBidTooLowTooltip(
    computeBidTooLowMetrics(v, dcSamConfig, winningTotalPmpe),
  )

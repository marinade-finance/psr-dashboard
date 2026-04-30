import { Color } from 'src/components/table/table'
import {
  ctaBlock,
  divider,
  okRow,
  row,
  sectionHeader,
  tableHead,
  tooltipHeader,
  wrapTable,
} from 'src/components/tooltip-table/tooltip-table'
import { formatSolAmount } from 'src/format'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const LABEL_EXP_MAX_BID = 'Expected max effective bid PMPE'
const LABEL_ONCHAIN_PMPE = 'On-chain distributed rewards PMPE'
const LABEL_PROJ_EXPOSED = 'Projected exposed stake'

const pay = (n: number) => `${formatSolAmount(Math.round(n), 2)} ☉`
const stake = (n: number) => `${formatSolAmount(n, 0)} ☉`
const pmpe = (x: number) => x.toFixed(5)

const finite = (x: number | null | undefined): number =>
  typeof x === 'number' && Number.isFinite(x) ? x : 0

export type BondMetrics = {
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

export const computeBondMetrics = (
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
): BondMetrics => {
  const bondBalanceSol = v.bondBalanceSol ?? 0
  const claimableBondBalanceSol = v.claimableBondBalanceSol ?? 0
  const marinadeActivatedStakeSol = v.marinadeActivatedStakeSol
  const paidUndelegationSol = v.values?.paidUndelegationSol ?? 0
  const expectedMaxEffBidPmpe = finite(v.revShare?.expectedMaxEffBidPmpe)
  const onchainDistributedPmpe = finite(v.revShare?.onchainDistributedPmpe)
  const unprotectedStakeSol = v.unprotectedStakeSol ?? 0

  // Strip this cycle's freshly-charged undelegation so the projection isn't
  // implicitly re-charging on the already-penalized base.
  // Bond-risk fresh contribution to paidUndelegationSol is min(1, mult) * value
  // (calculations.js:94).
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

  // Split for presentation: onchain part vs bid cushion part.
  const onchainBase = (onchainDistributedPmpe / 1000) * projectedExposedStakeSol
  const minCoverageBid =
    ((minEp * expectedMaxEffBidPmpe) / 1000) * projectedExposedStakeSol
  // floorBase mirrors SDK fee trigger threshold (incl. minUnprotectedReserve):
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

const statusLine = (color: Color | undefined): string => {
  switch (color) {
    case Color.RED:
      return 'Penalty imminent. Top up to avoid it.'
    case Color.ORANGE:
      return 'Penalty risk. Top up to prevent it.'
    case Color.YELLOW:
      return 'Bond covers current stake. Top up for more stake.'
    case Color.GREEN:
      return 'Bond has enough coverage. Keep it topped up.'
    default:
      return ''
  }
}

export const renderBondBreakdownTooltip = (
  m: BondMetrics,
  bondState: Color | undefined,
  header: { name?: string; voteAccount: string },
  isSimulated = false,
): string => {
  const cta = ctaBlock({
    label: `${isSimulated ? 'Simulated · ' : ''}Bond Coverage Calculation Breakdown`,
    cta: statusLine(bondState),
    state: bondState,
  })

  const rates =
    sectionHeader('Rates') +
    tableHead(['', 'PMPE', '']) +
    row(LABEL_EXP_MAX_BID, pmpe(m.expectedMaxEffBidPmpe), '') +
    row(LABEL_ONCHAIN_PMPE, pmpe(m.onchainDistributedPmpe), '')

  const base =
    sectionHeader(`Minimum Coverage (${m.minEp} epochs)`) +
    row('Claimable bond balance', '', pay(m.claimableBondBalanceSol), {
      boldValue: true,
    }) +
    row('Activated Marinade stake', stake(m.marinadeActivatedStakeSol), '') +
    row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
    row('Minimum unprotected reserve', '', pay(m.minUnprotectedReserveSol)) +
    row('On-chain distributed reserve', '', pay(m.onchainBase)) +
    row('Minimum bid coverage', '', pay(m.minCoverageBid)) +
    divider() +
    row('Minimum required', '', pay(m.floorBase), { boldValue: true }) +
    (m.topUpToMin > 0
      ? row('Top-up to minimum coverage', '', pay(m.topUpToMin), {
          boldLabel: true,
          boldValue: true,
          large: true,
          accent: 'red',
        })
      : okRow('You have enough bond to cover the minimum.'))

  const tgt =
    sectionHeader(`Ideal Coverage (${m.idealEp} epochs)`) +
    row('Bond balance', '', pay(m.bondBalanceSol), { boldValue: true }) +
    row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
    row('Ideal unprotected reserve', '', pay(m.idealUnprotectedReserveSol)) +
    row('On-chain distributed reserve', '', pay(m.onchainBase)) +
    row('Ideal bid coverage', '', pay(m.idealCoverageBid)) +
    divider() +
    row('Ideal required', '', pay(m.requiredIdeal), { boldValue: true }) +
    (m.topUpToIdeal > 0
      ? row('To get more stake, top up', '', pay(m.topUpToIdeal), {
          boldLabel: true,
          boldValue: true,
          large: true,
          accent: 'yellow',
        })
      : okRow('Bond has enough coverage to receive more stake.'))

  return cta + wrapTable(tooltipHeader(header) + rates + base + tgt)
}

export const buildBondBreakdownTooltip = (
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
  bondState: Color | undefined,
  name?: string,
  isSimulated = false,
): string =>
  renderBondBreakdownTooltip(
    computeBondMetrics(
      v,
      minBondEpochs,
      idealBondEpochs,
      winningTotalPmpe,
      bondRiskFeeMult,
    ),
    bondState,
    { name, voteAccount: v.voteAccount },
    isSimulated,
  )

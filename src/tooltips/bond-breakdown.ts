import { Color } from 'src/components/table/table'
import {
  ctaBlock,
  divider,
  okRow,
  row,
  sectionHeader,
  tableHead,
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
  marinadeSamTargetSol: number
  expectedMaxEffBidPmpe: number
  onchainDistributedPmpe: number
  projectedExposedStakeSol: number
  minUnprotectedReserveSol: number
  idealUnprotectedReserveSol: number
  minBondPmpe: number
  idealBondPmpe: number
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
  const marinadeSamTargetSol = v.auctionStake.marinadeSamTargetSol ?? 0
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
    marinadeSamTargetSol,
    expectedMaxEffBidPmpe,
    onchainDistributedPmpe,
    projectedExposedStakeSol,
    minUnprotectedReserveSol,
    idealUnprotectedReserveSol,
    minBondPmpe,
    idealBondPmpe,
    onchainBase,
    minCoverageBid,
    floorBase,
    topUpToMin,
    idealCoverageBid,
    requiredIdeal,
    topUpToIdeal,
  }
}

const statusLine = (color: Color | undefined, topUpToMin: number): string => {
  switch (color) {
    case Color.RED:
      return topUpToMin > 0
        ? `Undelegation imminent. Top up ${pay(topUpToMin)} now to retain stake.`
        : 'Runway critical. Review bond setup to retain stake.'
    case Color.ORANGE:
      return topUpToMin > 0
        ? `Below minimum coverage. Top up ${pay(topUpToMin)} soon to avoid bond risk fee charges.`
        : 'Below minimum coverage. Review bond setup to avoid bond risk fee charges.'
    case Color.YELLOW:
      return 'Minimum coverage met. Top up to reach ideal coverage for more stake.'
    case Color.GREEN:
      return 'Ideal coverage reached. Keep bond topped up to absorb bid drain.'
    default:
      return ''
  }
}

export const renderBondBreakdownTooltip = (
  m: BondMetrics,
  bondState: Color | undefined,
  isSimulated = false,
): string => {
  const cta = ctaBlock({
    label: `${isSimulated ? 'Simulated · ' : ''}Bond Coverage Calculation Breakdown`,
    cta: statusLine(bondState, m.topUpToMin),
    state: bondState,
  })

  const rates =
    sectionHeader('Rates') +
    tableHead(['', 'PMPE', '']) +
    row(LABEL_EXP_MAX_BID, pmpe(m.expectedMaxEffBidPmpe), '') +
    row(LABEL_ONCHAIN_PMPE, pmpe(m.onchainDistributedPmpe), '')

  const base =
    sectionHeader(`Minimum Coverage (${m.minEp} epochs)`) +
    tableHead(['', '', '☉']) +
    row('Claimable bond balance', '', pay(m.claimableBondBalanceSol), {
      boldValue: true,
    }) +
    row('Activated Marinade stake', stake(m.marinadeActivatedStakeSol), '') +
    row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
    row('Minimum unprotected reserve', '', pay(m.minUnprotectedReserveSol)) +
    row('On-chain distributed reserve', '', pay(m.onchainBase)) +
    row('Minimum coverage bid', '', pay(m.minCoverageBid)) +
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
    m.marinadeSamTargetSol <= 0
      ? sectionHeader(`Ideal Coverage (${m.idealEp} epochs)`) +
        okRow('Not in current auction — ideal coverage not applicable.')
      : sectionHeader(`Ideal Coverage (${m.idealEp} epochs)`) +
        tableHead(['', '', '☉']) +
        row('Bond balance', '', pay(m.bondBalanceSol), { boldValue: true }) +
        row(
          'Activated Marinade stake',
          stake(m.marinadeActivatedStakeSol),
          '',
        ) +
        row('SAM target stake', stake(m.marinadeSamTargetSol), '') +
        row(
          'Max (activated, target)',
          stake(Math.max(m.marinadeActivatedStakeSol, m.marinadeSamTargetSol)),
          '',
        ) +
        row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
        row(
          'Ideal unprotected reserve',
          '',
          pay(m.idealUnprotectedReserveSol),
        ) +
        row('On-chain distributed reserve', '', pay(m.onchainBase)) +
        row('Ideal coverage bid', '', pay(m.idealCoverageBid)) +
        divider() +
        row('Ideal required', '', pay(m.requiredIdeal), { boldValue: true }) +
        (m.topUpToIdeal > 0
          ? row('To get more stake, top up', '', pay(m.topUpToIdeal), {
              boldLabel: true,
              boldValue: true,
              large: true,
              accent: 'yellow',
            })
          : okRow(
              'You have enough bond for ideal coverage; topping up further is advisable to absorb bid drain.',
            ))

  return cta + wrapTable(rates + base + tgt)
}

export const buildBondBreakdownTooltip = (
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
  bondState: Color | undefined,
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
    isSimulated,
  )

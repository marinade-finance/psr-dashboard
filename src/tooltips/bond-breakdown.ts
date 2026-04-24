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

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const LABEL_EXP_MAX_BID = 'Expected max effective bid PMPE'
const LABEL_ONCHAIN_PMPE = 'On-chain distributed rewards PMPE'
const LABEL_PROJ_EXPOSED = 'Projected exposed stake'
const SUFFIX_PROJ_EXPOSED = '× projected exposed stake'

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
  paidUndelegationSol: number
  marinadeSamTargetSol: number
  expectedMaxEffBidPmpe: number
  onchainDistributedPmpe: number
  protectedStakeSol: number
  projectedActivatedStakeSol: number
  projectedExposedStakeSol: number
  minUnprotectedReserveSol: number
  idealUnprotectedReserveSol: number
  minBondPmpe: number
  idealBondPmpe: number
  onchainBase: number
  minCoverageBid: number
  floorBase: number
  topUpToMin: number
  idealOnchainBase: number
  idealCoverageBid: number
  requiredIdeal: number
  topUpToIdeal: number
}

export const computeBondMetrics = (
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
): BondMetrics => {
  const bondBalanceSol = v.bondBalanceSol ?? 0
  const claimableBondBalanceSol = v.claimableBondBalanceSol ?? 0
  const marinadeActivatedStakeSol = v.marinadeActivatedStakeSol
  const paidUndelegationSol = v.values?.paidUndelegationSol ?? 0
  const marinadeSamTargetSol = v.auctionStake.marinadeSamTargetSol ?? 0
  const expectedMaxEffBidPmpe = finite(v.revShare?.expectedMaxEffBidPmpe)
  const onchainDistributedPmpe = finite(v.revShare?.onchainDistributedPmpe)
  const unprotectedStakeSol = v.unprotectedStakeSol ?? 0

  const projectedActivatedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - paidUndelegationSol,
  )
  const projectedExposedStakeSol = Math.max(
    0,
    projectedActivatedStakeSol - unprotectedStakeSol,
  )
  const protectedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - unprotectedStakeSol,
  )

  const minUnprotectedReserveSol = finite(v.minUnprotectedReserve)
  const idealUnprotectedReserveSol = finite(v.idealUnprotectedReserve)

  const minEp = 1 + minBondEpochs
  const idealEp = 1 + idealBondEpochs

  // Mirror SDK: minBondPmpe = onchainDistributedPmpe + (1 + minBondEpochs) * expectedMaxEffBidPmpe
  // The constraints.js formulation packs onchain + 1-epoch bid + minBondEpochs*bid into one PMPE.
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

  const idealOnchainBase =
    (onchainDistributedPmpe / 1000) * projectedExposedStakeSol
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
    paidUndelegationSol,
    marinadeSamTargetSol,
    expectedMaxEffBidPmpe,
    onchainDistributedPmpe,
    protectedStakeSol,
    projectedActivatedStakeSol,
    projectedExposedStakeSol,
    minUnprotectedReserveSol,
    idealUnprotectedReserveSol,
    minBondPmpe,
    idealBondPmpe,
    onchainBase,
    minCoverageBid,
    floorBase,
    topUpToMin,
    idealOnchainBase,
    idealCoverageBid,
    requiredIdeal,
    topUpToIdeal,
  }
}

const statusLines = (
  color: Color | undefined,
  topUpToMin: number,
): { lead: string; cta: string } => {
  switch (color) {
    case Color.RED:
      return topUpToMin > 0
        ? {
            lead: 'Undelegation imminent.',
            cta: `Top up ${pay(topUpToMin)} now to retain stake.`,
          }
        : {
            lead: 'Runway critical.',
            cta: 'Review bond setup to retain stake.',
          }
    case Color.ORANGE:
      return topUpToMin > 0
        ? {
            lead: 'Below minimum coverage.',
            cta: `Top up ${pay(topUpToMin)} soon to avoid bond risk fee charges.`,
          }
        : {
            lead: 'Below minimum coverage.',
            cta: 'Review bond setup to avoid bond risk fee charges.',
          }
    case Color.YELLOW:
      return {
        lead: 'Minimum coverage met.',
        cta: 'Top up to reach ideal coverage for more stake.',
      }
    case Color.GREEN:
      return {
        lead: 'Ideal coverage reached.',
        cta: 'Keep bond topped up to absorb bid drain.',
      }
    default:
      return { lead: '', cta: '' }
  }
}

export const renderBondBreakdownTooltip = (
  m: BondMetrics,
  bondState: Color | undefined,
): string => {
  const { lead, cta: ctaText } = statusLines(bondState, m.topUpToMin)
  const cta = ctaBlock({
    label: 'Bond Coverage Calculation Breakdown',
    lead,
    cta: ctaText,
    state: bondState,
  })

  const rates =
    sectionHeader('Rates') +
    row(LABEL_EXP_MAX_BID, '', pmpe(m.expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(m.onchainDistributedPmpe))

  const base =
    sectionHeader(`Minimum Coverage (${m.minEp} epochs)`) +
    row('Claimable bond balance', '', pay(m.claimableBondBalanceSol), {
      boldValue: true,
    }) +
    row('Activated Marinade stake', stake(m.marinadeActivatedStakeSol), '') +
    row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
    row(LABEL_EXP_MAX_BID, '', pmpe(m.expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(m.onchainDistributedPmpe)) +
    row('Minimum unprotected reserve', '', pay(m.minUnprotectedReserveSol)) +
    row(
      'On-chain distributed reserve',
      SUFFIX_PROJ_EXPOSED,
      pay(m.onchainBase),
    ) +
    row('Minimum coverage bid', SUFFIX_PROJ_EXPOSED, pay(m.minCoverageBid)) +
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
        row('Bond balance', '', pay(m.bondBalanceSol), { boldValue: true }) +
        row('SAM target stake', stake(m.marinadeSamTargetSol), '') +
        row(LABEL_PROJ_EXPOSED, stake(m.projectedExposedStakeSol), '') +
        row(LABEL_EXP_MAX_BID, '', pmpe(m.expectedMaxEffBidPmpe)) +
        row(LABEL_ONCHAIN_PMPE, '', pmpe(m.onchainDistributedPmpe)) +
        row(
          'Ideal unprotected reserve',
          '',
          pay(m.idealUnprotectedReserveSol),
        ) +
        row(
          'On-chain distributed reserve',
          SUFFIX_PROJ_EXPOSED,
          pay(m.idealOnchainBase),
        ) +
        row(
          'Ideal coverage bid',
          SUFFIX_PROJ_EXPOSED,
          pay(m.idealCoverageBid),
        ) +
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
  bondState: Color | undefined,
): string =>
  renderBondBreakdownTooltip(
    computeBondMetrics(v, minBondEpochs, idealBondEpochs),
    bondState,
  )

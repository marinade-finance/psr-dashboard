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

const pay = (n: number) => `${formatSolAmount(Math.round(n), 2)} ☉`
const stake = (n: number) => `${formatSolAmount(n, 0)} ☉`
const pmpe = (x: number) => x.toFixed(5)

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
  onchainBase: number
  minCoverageActivated: number
  minCoverageUndel: number
  floorBase: number
  topUpToMin: number
  onchainTarget: number
  idealCoverageTarget: number
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
  const expectedMaxEffBidPmpe = v.revShare.expectedMaxEffBidPmpe
  const onchainDistributedPmpe = v.revShare.onchainDistributedPmpe
  const unprotectedStakeSol = v.unprotectedStakeSol ?? 0
  const protectedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - unprotectedStakeSol,
  )

  const minEp = 1 + minBondEpochs
  const idealEp = 1 + idealBondEpochs

  const epochBidActivated =
    (expectedMaxEffBidPmpe / 1000) * marinadeActivatedStakeSol
  const epochBidPaidUndel = (expectedMaxEffBidPmpe / 1000) * paidUndelegationSol
  const onchainBase = (onchainDistributedPmpe / 1000) * protectedStakeSol
  const minCoverageActivated = minEp * epochBidActivated
  const minCoverageUndel = minEp * epochBidPaidUndel
  const floorBase = onchainBase + minCoverageActivated + minCoverageUndel
  const topUpToMin = Math.max(0, floorBase - claimableBondBalanceSol)

  const epochBidTarget = (expectedMaxEffBidPmpe / 1000) * marinadeSamTargetSol
  const onchainTarget = (onchainDistributedPmpe / 1000) * marinadeSamTargetSol
  const idealCoverageTarget = idealEp * epochBidTarget
  const requiredIdeal = onchainTarget + idealCoverageTarget
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
    onchainBase,
    minCoverageActivated,
    minCoverageUndel,
    floorBase,
    topUpToMin,
    onchainTarget,
    idealCoverageTarget,
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
      return {
        lead: 'Undelegation imminent.',
        cta: `Top up ${pay(topUpToMin)} now to retain stake.`,
      }
    case Color.ORANGE:
      return {
        lead: 'Below minimum coverage.',
        cta: `Top up ${pay(topUpToMin)} soon to avoid bond risk fee charges.`,
      }
    case Color.YELLOW:
      return {
        lead: 'Minimum coverage met.',
        cta: 'Top up to reach ideal coverage for more stake.',
      }
    case Color.GREEN:
      return {
        lead: 'Ideal coverage reached.',
        cta: 'Bond is not limiting your stake.',
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
    row('Protected stake', stake(m.protectedStakeSol), '') +
    row(LABEL_EXP_MAX_BID, '', pmpe(m.expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(m.onchainDistributedPmpe)) +
    row(
      'On-chain distributed reserve',
      '× protected stake',
      pay(m.onchainBase),
    ) +
    row(
      'Minimum coverage bid',
      '× activated stake',
      pay(m.minCoverageActivated),
    ) +
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
    row('SAM target stake', stake(m.marinadeSamTargetSol), '') +
    row(LABEL_EXP_MAX_BID, '', pmpe(m.expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(m.onchainDistributedPmpe)) +
    row(
      'On-chain distributed reserve',
      '× SAM target stake',
      pay(m.onchainTarget),
    ) +
    row(
      'Ideal coverage bid',
      '× SAM target stake',
      pay(m.idealCoverageTarget),
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

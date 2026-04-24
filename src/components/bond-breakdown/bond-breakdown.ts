import { Color } from 'src/components/table/table'
import { formatSolAmount } from 'src/format'

import './bond-breakdown.css'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const LABEL_EXP_MAX_BID = 'Expected max effective bid PMPE'
const LABEL_ONCHAIN_PMPE = 'On-chain distributed rewards PMPE'

// Map the legacy valueColor hex strings onto semantic bond-breakdown CSS
// classes so existing row() call sites keep working unchanged.
const valueClassFromColor = (color?: string): string => {
  switch (color) {
    case '#ff9a7a':
      return ' bbd-topup-red'
    case '#ffb27a':
      return ' bbd-topup-orange'
    case '#ffd27a':
      return ' bbd-topup-yellow'
    case '#9adca0':
      return ' bbd-ok'
    default:
      return ''
  }
}

const row = (
  label: string,
  qty: string,
  value: string,
  opts?: {
    boldLabel?: boolean
    boldValue?: boolean
    valueColor?: string
    large?: boolean
  },
) => {
  const boldLabel = opts?.boldLabel ?? false
  const boldValue = opts?.boldValue ?? false
  const largeCls = opts?.large ? ' bbd-large' : ''
  const valueColorCls = valueClassFromColor(opts?.valueColor)
  const labelBoldCls = boldLabel ? ' bbd-bold' : ''
  const valueBoldCls = boldValue ? ' bbd-bold' : ''
  return (
    '<tr>' +
    `<td class="bbd-label${labelBoldCls}${largeCls}">${label}</td>` +
    `<td class="bbd-qty">${qty}</td>` +
    `<td class="bbd-value${valueBoldCls}${largeCls}${valueColorCls}">${value}</td>` +
    '</tr>'
  )
}

const rule = (label: string) =>
  '<tr><td colspan="3" class="bbd-rule-spacer"></td></tr>' +
  `<tr><td colspan="3" class="bbd-rule">${label}</td></tr>`

const divider = () => '<tr><td colspan="3" class="bbd-divider"></td></tr>'

const okRow = (message: string) =>
  `<tr><td colspan="2" class="bbd-ok-msg">${message}</td>` +
  '<td class="bbd-value bbd-ok">●</td></tr>'

// Payment amounts: round to whole SOL, display with .00
const pay = (n: number) => `${formatSolAmount(Math.round(n), 2)} ☉`
// Stake amounts: whole SOL, no decimals
const stake = (n: number) => `${formatSolAmount(n, 0)} ☉`

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

const stateClass = (c: Color | undefined): string => {
  switch (c) {
    case Color.RED:
      return 'bbd-state-red'
    case Color.ORANGE:
      return 'bbd-state-orange'
    case Color.YELLOW:
      return 'bbd-state-yellow'
    case Color.GREEN:
      return 'bbd-state-green'
    default:
      return ''
  }
}

export const buildBondBreakdownTooltip = (
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  bondState: Color | undefined,
): string => {
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

  // Docs: minBondCoef = (onchainDistributedPmpe + (1+minBondEpochs) × expectedMaxEffBidPmpe) / 1000
  //       idealBondCoef = (onchainDistributedPmpe + (1+idealBondEpochs) × expectedMaxEffBidPmpe) / 1000
  const minEp = 1 + minBondEpochs
  const idealEp = 1 + idealBondEpochs

  // Section 1 — Minimum Coverage (claimable vs minBondCoef × (active + paidUndelegation))
  const epochBidActivated =
    (expectedMaxEffBidPmpe / 1000) * marinadeActivatedStakeSol
  const epochBidPaidUndel = (expectedMaxEffBidPmpe / 1000) * paidUndelegationSol
  const onchainBase = (onchainDistributedPmpe / 1000) * protectedStakeSol
  const minCoverageActivated = minEp * epochBidActivated
  const minCoverageUndel = minEp * epochBidPaidUndel
  const floorBase = onchainBase + minCoverageActivated + minCoverageUndel
  const topUpToMin = Math.max(0, floorBase - claimableBondBalanceSol)

  // Section 2 — Ideal Coverage (bond vs idealBondCoef × target)
  const epochBidTarget = (expectedMaxEffBidPmpe / 1000) * marinadeSamTargetSol
  const onchainTarget = (onchainDistributedPmpe / 1000) * marinadeSamTargetSol
  const idealCoverageTarget = idealEp * epochBidTarget
  const requiredIdeal = onchainTarget + idealCoverageTarget
  // Suggest a small cushion above ideal so the bond does not dip back under after a few epochs of bid drain.
  const suggestedBond = 1.2 * requiredIdeal
  const topUpToIdeal = Math.max(0, suggestedBond - bondBalanceSol)

  const pmpe = (x: number) => x.toFixed(5)

  const ctaClass = `bbd-cta ${stateClass(bondState)}`.trim()
  const { lead, cta: ctaText } = statusLines(bondState, topUpToMin)
  const cta =
    '<div class="bbd-cta-label">Bond Coverage Calculation Breakdown</div>' +
    `<div class="bbd-cta-lead">${lead}</div>` +
    `<div class="${ctaClass}">${ctaText}</div>`

  const rates =
    rule('Rates') +
    row(LABEL_EXP_MAX_BID, '', pmpe(expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(onchainDistributedPmpe))

  const base =
    rule(`Minimum Coverage (${minEp} epochs)`) +
    row('Claimable bond balance', '', pay(claimableBondBalanceSol), {
      boldValue: true,
    }) +
    row('Activated Marinade stake', stake(marinadeActivatedStakeSol), '') +
    row('Paid undelegation', pay(paidUndelegationSol), '') +
    row('Protected stake', stake(protectedStakeSol), '') +
    row(LABEL_EXP_MAX_BID, '', pmpe(expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(onchainDistributedPmpe)) +
    row('On-chain distributed reserve', '× protected stake', pay(onchainBase)) +
    row(
      'Minimum coverage bid',
      '× activated stake',
      pay(minCoverageActivated),
    ) +
    row('Minimum coverage bid', '× paid undelegation', pay(minCoverageUndel)) +
    divider() +
    row('Minimum required', '', pay(floorBase), { boldValue: true }) +
    (topUpToMin > 0
      ? row('Top-up to minimum coverage', '', pay(topUpToMin), {
          boldLabel: true,
          boldValue: true,
          large: true,
          valueColor: '#ff9a7a',
        })
      : okRow('You have enough bond to cover the minimum.'))

  const tgt =
    rule(`Ideal Coverage (${idealEp} epochs)`) +
    row('Bond balance', '', pay(bondBalanceSol), { boldValue: true }) +
    row('SAM target stake', stake(marinadeSamTargetSol), '') +
    row(LABEL_EXP_MAX_BID, '', pmpe(expectedMaxEffBidPmpe)) +
    row(LABEL_ONCHAIN_PMPE, '', pmpe(onchainDistributedPmpe)) +
    row(
      'On-chain distributed reserve',
      '× SAM target stake',
      pay(onchainTarget),
    ) +
    row('Ideal coverage bid', '× SAM target stake', pay(idealCoverageTarget)) +
    divider() +
    row('Ideal required', '', pay(requiredIdeal), { boldValue: true }) +
    (topUpToIdeal > 0
      ? row('To get more stake, top up', '', pay(topUpToIdeal), {
          boldLabel: true,
          boldValue: true,
          large: true,
          valueColor: '#ffd27a',
        })
      : okRow('You have enough bond to receive more stake.'))

  return cta + '<table class="bbd-table">' + rates + base + tgt + '</table>'
}

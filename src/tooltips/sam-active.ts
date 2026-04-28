import {
  cell,
  ctaBlock,
  divider,
  rowCells,
  sectionHeader,
  tableHead,
  wrapTable,
} from 'src/components/tooltip-table/tooltip-table'
import { formatPercentage, formatSolAmount } from 'src/format'
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

import type { AugmentedAuctionValidator } from 'src/services/sam'

export type SamActiveMetrics = {
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

export function computeSamActiveMetrics(
  v: AugmentedAuctionValidator,
): SamActiveMetrics {
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

const stakeRow = (
  label: string,
  value: string,
  opts?: { boldValue?: boolean; accent?: 'green' | 'red' },
) =>
  rowCells([
    cell(label, { wrap: true }),
    cell('', {}),
    cell('', {}),
    cell(value, {
      align: 'right',
      mono: true,
      bold: opts?.boldValue,
      accent: opts?.accent,
    }),
  ])

const commRow = (label: string, pct: string, pmpe: string) =>
  rowCells([
    cell(label, { wrap: true }),
    cell(pct, { align: 'right', muted: true, mono: true }),
    cell(pmpe, { align: 'right', muted: true, mono: true }),
    cell('', {}),
  ])

const chargeRow = (
  label: string,
  rateStr: string,
  stakeStr: string,
  costStr: string,
  opts?: { boldLabel?: boolean; boldValue?: boolean },
) =>
  rowCells([
    cell(label, { wrap: true, bold: opts?.boldLabel }),
    cell(rateStr, { align: 'right', muted: true, mono: true }),
    cell(stakeStr, { align: 'right', muted: true, mono: true }),
    cell(costStr, {
      align: 'right',
      mono: true,
      bold: opts?.boldValue,
    }),
  ])

export function renderSamActiveTooltip(
  m: SamActiveMetrics,
  overrideMsg?: string,
): string {
  const deltaAccent: 'green' | 'red' | undefined =
    m.delta > 0 ? 'green' : m.delta < 0 ? 'red' : undefined
  const deltaStr =
    m.delta === 0
      ? '—'
      : `${m.delta > 0 ? '+' : '−'}${formatSolAmount(Math.abs(m.delta), 0)} ☉`

  const stakeSec =
    sectionHeader('Stake', 4) +
    stakeRow('SAM Active', `${formatSolAmount(m.active, 0)} ☉`) +
    stakeRow('SAM Target', `${formatSolAmount(m.target, 0)} ☉`) +
    stakeRow('Expected change next epoch', deltaStr, {
      boldValue: true,
      accent: deltaAccent,
    })

  const commSec =
    sectionHeader('Commissions', 4) +
    commRow('Inflation', m.inflPct, `${formatSolAmount(m.inflPmpe, 4)} ☉`) +
    commRow('MEV', m.mevPct, `${formatSolAmount(m.mevPmpe, 4)} ☉`) +
    commRow('Block', m.blkPct, `${formatSolAmount(m.blkPmpe, 4)} ☉`)

  const chargeSec =
    sectionHeader('Charge this epoch', 4) +
    tableHead(['', 'PMPE', 'Stake (☉)', 'Cost (☉)']) +
    chargeRow('St. Bid', formatSolAmount(m.bid, 4), '', '') +
    chargeRow('Eff. Bid', formatSolAmount(m.effBid, 4), '', '') +
    chargeRow(
      'Activating charge',
      '',
      `~${formatSolAmount(m.activating, 0)}`,
      formatSolAmount(m.activatingCost, 3),
    ) +
    chargeRow(
      'Active charge',
      '',
      formatSolAmount(m.stake, 0),
      formatSolAmount(m.cost, 3),
    ) +
    divider(4) +
    chargeRow('Total Charge', '', '', formatSolAmount(m.total, 3), {
      boldLabel: true,
      boldValue: true,
    })

  const msg = overrideMsg ?? m.overrideMsg
  const cta = ctaBlock({
    label: 'Stake & Bid Charge',
    lead: msg ? msg.replace(/<br\/?>/g, ' ') : undefined,
  })

  return cta + wrapTable(stakeSec + commSec + chargeSec)
}

export function buildSamActiveTooltip(v: AugmentedAuctionValidator): string {
  return renderSamActiveTooltip(computeSamActiveMetrics(v))
}

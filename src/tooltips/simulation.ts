import {
  ctaBlock,
  row,
  sectionHeader,
  tableHead,
  wrapTable,
} from 'src/components/tooltip-table/tooltip-table'
import { formatPercentage, formatSolAmount } from 'src/format'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { DashboardOverrides } from 'src/services/sam'

type Row = { label: string; orig: string; sim: string }

export const buildSimulationOverridesTable = (
  va: string,
  original: AuctionValidator | undefined,
  overrides: DashboardOverrides | null,
): string => {
  if (!overrides) return ''
  const rows: Row[] = []

  const bid = overrides.cpmpesDec?.get(va)
  if (bid !== undefined) {
    rows.push({
      label: 'Bid PMPE',
      orig: original ? formatSolAmount(original.revShare.bidPmpe, 4) : '—',
      sim: formatSolAmount(bid, 4),
    })
  }
  const infl = overrides.inflationCommissionsDec?.get(va)
  if (infl !== undefined) {
    rows.push({
      label: 'Inflation commission',
      orig: original
        ? formatPercentage(original.inflationCommissionDec ?? 0, 0)
        : '—',
      sim: formatPercentage(infl, 0),
    })
  }
  const mev = overrides.mevCommissionsDec?.get(va)
  if (mev !== undefined) {
    rows.push({
      label: 'MEV commission',
      orig: original
        ? formatPercentage(original.mevCommissionDec ?? 0, 0)
        : '—',
      sim: formatPercentage(mev, 0),
    })
  }
  const blk = overrides.blockRewardsCommissionsDec?.get(va)
  if (blk !== undefined) {
    rows.push({
      label: 'Block-rewards commission',
      orig: original
        ? formatPercentage(original.blockRewardsCommissionDec ?? 1, 0)
        : '—',
      sim: formatPercentage(blk, 0),
    })
  }
  const bond = overrides.bondTopUpSol?.get(va)
  if (bond !== undefined && bond !== 0) {
    const sign = bond > 0 ? '+' : '−'
    rows.push({
      label: 'Bond top-up',
      orig: original
        ? `${formatSolAmount(original.bondBalanceSol ?? 0, 0)} ☉`
        : '—',
      sim: `${sign}${formatSolAmount(Math.abs(bond), 0)} ☉`,
    })
  }

  if (rows.length === 0) {
    return ctaBlock({ label: 'Simulated' })
  }

  const head = ctaBlock({ label: 'Simulated' })
  const body =
    sectionHeader('Overrides') +
    tableHead(['', 'Original', 'Simulated']) +
    rows.map(r => row(r.label, r.orig, r.sim)).join('')
  return head + wrapTable(body)
}

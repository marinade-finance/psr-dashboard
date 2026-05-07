import React from 'react'

import { pay, pmpe, stake } from 'src/format'
import { docsPath } from 'src/lib/utils'
import { computeSamRevenueMetrics } from 'src/services/breakdowns'

import {
  CalcCard,
  Marker,
  NORMAL_CELL_PAD,
  SectionHeader,
  SEPARATOR_CELL_PAD,
  SEPARATOR_TR_CLASS,
} from './shared'

import type { UserLevel } from 'src/components/navigation/navigation'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  validator: AugmentedAuctionValidator
  isSimulated?: boolean
  onGoToSim?: () => void
  level?: UserLevel
}

// 4-column row unique to revenue breakdown (pct | pmpe | sol)
const RevRow: React.FC<{
  label: string
  pct?: string
  pmpe?: string
  value: string
  bold?: boolean
  accent?: 'green' | 'yellow' | 'red'
  separator?: boolean
  marker?: 'red' | 'yellow' | 'green'
}> = ({
  label,
  pct,
  pmpe: pmpeStr,
  value,
  bold,
  accent,
  separator,
  marker,
}) => (
  <tr
    className={`border-b border-border-grid/50 last:border-b-0 ${separator ? SEPARATOR_TR_CLASS : ''}`}
  >
    <td
      className={`pr-2 text-xs ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${bold ? 'font-semibold' : ''} ${separator ? 'text-foreground' : ''}`}
    >
      {marker && <Marker tone={marker} />}
      {label}
    </td>
    <td
      className={`px-2 text-right font-mono text-xs text-muted-foreground ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD}`}
    >
      {pct ?? ''}
    </td>
    <td
      className={`px-2 text-right font-mono text-xs text-muted-foreground ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD}`}
    >
      {pmpeStr ?? ''}
    </td>
    <td
      className={`pl-2 text-right font-mono text-xs ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${bold ? 'font-semibold' : ''} ${
        accent === 'green'
          ? 'text-status-green'
          : accent === 'yellow'
            ? 'text-status-yellow'
            : accent === 'red'
              ? 'text-destructive'
              : ''
      }`}
    >
      {value}
    </td>
  </tr>
)

export const SamRevenueBreakdown: React.FC<Props> = ({
  validator,
  isSimulated,
  onGoToSim,
  level,
}) => {
  const m = computeSamRevenueMetrics(validator)
  const deltaAccent = m.delta > 0 ? 'green' : m.delta < 0 ? 'red' : undefined
  const deltaText =
    m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${stake(m.delta)}`

  const status = {
    label:
      m.total > 0
        ? `Estimated ${pay(m.total)} payment to Marinade this epoch.`
        : 'No bid cost this epoch.',
    tone: 'green' as const,
  }

  const cta = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      Simulate commission or bid changes →
    </button>
  ) : null

  return (
    <CalcCard
      title="SAM Revenue Calculation"
      guideTo={`${docsPath(level)}#cpmpe`}
      isSimulated={isSimulated}
      status={status}
      cta={cta}
    >
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full">
        <tbody>
          <SectionHeader title="Stake" colSpan={4} />
          <RevRow label="Active Marinade stake" value={stake(m.active)} bold />
          <RevRow label="Target Marinade stake" value={stake(m.target)} />
          <RevRow
            label="Expected change next epoch"
            value={deltaText}
            accent={deltaAccent}
          />

          <SectionHeader title="Commissions" colSpan={4} />
          <RevRow
            label="Inflation"
            pct={m.inflPct}
            pmpe={pmpe(m.inflPmpe)}
            value=""
          />
          <RevRow label="MEV" pct={m.mevPct} pmpe={pmpe(m.mevPmpe)} value="" />
          <RevRow
            label="Block rewards"
            pct={m.blkPct}
            pmpe={pmpe(m.blkPmpe)}
            value=""
          />

          <SectionHeader title="Bid" colSpan={4} />
          <RevRow label="Static bid PMPE" pmpe={pmpe(m.bid)} value="" />
          <RevRow
            label="Auction effective bid PMPE"
            pmpe={pmpe(m.effBid)}
            value=""
            bold
          />
          <RevRow
            label="Bid gap"
            pmpe={pmpe(m.bidGap)}
            value=""
            accent={
              m.bidGap > 2 ? 'yellow' : m.bidGap === 0 ? 'green' : undefined
            }
          />

          <SectionHeader title="Cost" colSpan={4} />
          <RevRow label="Active Stake Cost" value={pay(m.cost)} />
          {m.activating > 0 && (
            <RevRow
              label="Activating Stake Cost"
              pmpe={pmpe(m.activatingStakePmpe)}
              value={pay(m.activatingCost)}
            />
          )}
          <RevRow
            label="Total per epoch"
            value={pay(m.total)}
            bold
            separator
            marker="green"
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

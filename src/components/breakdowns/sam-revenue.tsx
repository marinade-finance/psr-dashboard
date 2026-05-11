import React from 'react'

import { pay, pmpe, stake } from 'src/format'
import { computeSamRevenueMetrics } from 'src/services/breakdowns'

import {
  CalcCard,
  docsPath,
  Marker,
  NORMAL_CELL_PAD,
  SectionHeader,
  SEPARATOR_CELL_PAD,
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
  large?: boolean
  accent?: 'green' | 'yellow' | 'red'
  separator?: boolean
  marker?: 'red' | 'yellow' | 'green'
}> = ({
  label,
  pct,
  pmpe: pmpeStr,
  value,
  bold,
  large,
  accent,
  separator,
  marker,
}) => (
  <tr className={'border-b border-border-grid/50 last:border-b-0'}>
    <td
      className={`pr-2 ${large ? 'text-base' : 'text-xs'} ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${bold ? 'font-semibold' : ''} ${separator ? 'text-foreground' : ''}`}
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
      className={`pl-2 text-right font-mono ${large ? 'text-base' : 'text-xs'} ${separator ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${bold ? 'font-semibold' : ''} ${separator ? 'border-t-2 border-border' : ''} ${
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
  const metrics = computeSamRevenueMetrics(validator)
  const deltaAccent =
    metrics.delta > 0 ? 'green' : metrics.delta < 0 ? 'red' : undefined
  const deltaText =
    metrics.delta === 0
      ? '—'
      : `${metrics.delta > 0 ? '+' : ''}${stake(metrics.delta)}`

  const status = {
    label:
      metrics.total > 0
        ? `Estimated ${pay(metrics.total)} payment to Marinade this epoch.`
        : 'No bid cost this epoch.',
    tone: 'green' as const,
  }

  const tip = onGoToSim ? (
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
      tip={tip}
    >
      {metrics.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {metrics.overrideMsg}
        </div>
      )}
      <table className="w-full">
        <tbody>
          <SectionHeader title="Stake" colSpan={4} />
          <RevRow
            label="Active Marinade stake"
            value={stake(metrics.active)}
            bold
          />
          <RevRow label="Target Marinade stake" value={stake(metrics.target)} />
          <RevRow
            label="Expected change next epoch"
            value={deltaText}
            accent={deltaAccent}
          />

          <SectionHeader title="Commissions" colSpan={4} />
          <RevRow
            label="Inflation"
            pct={metrics.inflPct}
            pmpe={pmpe(metrics.inflPmpe)}
            value=""
          />
          <RevRow
            label="MEV"
            pct={metrics.mevPct}
            pmpe={pmpe(metrics.mevPmpe)}
            value=""
          />
          <RevRow
            label="Block rewards"
            pct={metrics.blkPct}
            pmpe={pmpe(metrics.blkPmpe)}
            value=""
          />

          <SectionHeader title="Bid" colSpan={4} />
          <RevRow label="Static bid PMPE" pmpe={pmpe(metrics.bid)} value="" />
          <RevRow
            label="Auction effective bid PMPE"
            pmpe={pmpe(metrics.effBid)}
            value=""
            bold
          />
          <RevRow
            label="Bid gap"
            pmpe={pmpe(metrics.bidGap)}
            value=""
            accent={
              metrics.bidGap > 2
                ? 'yellow'
                : metrics.bidGap === 0
                  ? 'green'
                  : undefined
            }
          />

          <SectionHeader title="Cost" colSpan={4} />
          <RevRow label="Active Stake Cost" value={pay(metrics.cost)} />
          <RevRow
            label="Activating Stake Cost"
            pmpe={pmpe(metrics.activatingStakePmpe)}
            value={pay(metrics.activatingCost)}
          />
          <RevRow
            label="Total per epoch"
            value={pay(metrics.total)}
            bold
            large
            separator
            marker="green"
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

import React from 'react'

import { cn } from 'src/class_utils'
import { cost, pmpe, stake } from 'src/format'
import { computeBidding } from 'src/services/bidding'

import { CalcCard } from './card'
import {
  Marker,
  NORMAL_CELL_PAD,
  SectionHeader,
  SEPARATOR_CELL_PAD,
  type Severity,
  TOTAL_CELL_PAD,
} from './row'

import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  isSimulated?: boolean
  onGoToSim?: () => void
}

const SEVERITY_TONE: Record<Severity, 'green' | 'yellow' | 'red'> = {
  ok: 'green',
  warning: 'yellow',
  error: 'red',
}

// 4-column row unique to revenue breakdown (pct | pmpe | sol)
const RevRow: React.FC<{
  label: string
  pct?: string
  pmpe?: string
  value?: string
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
  severity?: Severity
}> = ({
  label,
  pct,
  pmpe: pmpeStr,
  value = '',
  bold,
  large,
  separator,
  total,
  severity,
}) => {
  const tone = severity ? SEVERITY_TONE[severity] : undefined
  const sep = total || separator
  const bld = total || bold
  const lg = total || large
  const cellPad = total
    ? TOTAL_CELL_PAD
    : sep
      ? SEPARATOR_CELL_PAD
      : NORMAL_CELL_PAD
  const sepBorder = total
    ? 'border-t border-muted-foreground/30'
    : sep && 'border-t-2 border-border'
  const labelColor = total ? 'text-foreground' : 'text-muted-foreground'
  return (
    <tr className="border-b border-border-grid/65 last:border-b-0">
      <td
        className={cn(
          'pr-2',
          lg ? 'text-base' : 'text-xs',
          cellPad,
          bld && 'font-semibold',
          labelColor,
          sepBorder,
        )}
      >
        {tone && !total && <Marker tone={tone} />}
        {label}
      </td>
      <td
        className={cn(
          'px-2 text-right font-mono text-xs text-muted-foreground',
          cellPad,
          sepBorder,
        )}
      >
        {pct ?? ''}
      </td>
      <td
        className={cn(
          'px-2 text-right font-mono text-xs text-muted-foreground',
          cellPad,
          sepBorder,
        )}
      >
        {pmpeStr ?? ''}
      </td>
      <td
        className={cn(
          'pl-2 text-right font-mono',
          lg ? 'text-base' : 'text-xs',
          cellPad,
          bld && 'font-semibold',
          total ? 'tabular-nums text-foreground' : 'text-muted-foreground',
          sepBorder,
          tone === 'green' && 'text-status-green',
          tone === 'yellow' && 'text-status-yellow',
          tone === 'red' && 'text-destructive',
        )}
      >
        {value}
      </td>
    </tr>
  )
}

export const BiddingBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  isSimulated,
  onGoToSim,
}) => {
  const metrics = computeBidding(validator)
  const deltaSeverity: Severity | undefined =
    metrics.delta > 0 ? 'ok' : metrics.delta < 0 ? 'error' : undefined
  const deltaText =
    metrics.delta === 0
      ? '—'
      : `${metrics.delta > 0 ? '+' : ''}${stake(metrics.delta)}`

  const status = {
    label:
      metrics.total > 0
        ? `Estimated ${cost(metrics.total)} payment to Marinade this epoch.`
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
      title={title}
      guideTo={guideTo}
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
            severity={deltaSeverity}
          />

          <SectionHeader title="Total cost PMPE" colSpan={4} />
          <RevRow
            label="Inflation"
            pct={metrics.inflPct}
            pmpe={pmpe(metrics.inflPmpe)}
          />
          <RevRow
            label="MEV"
            pct={metrics.mevPct}
            pmpe={pmpe(metrics.mevPmpe)}
          />
          <RevRow
            label="Block rewards"
            pct={metrics.blkPct}
            pmpe={pmpe(metrics.blkPmpe)}
          />
          <RevRow label="Static bid PMPE" pmpe={pmpe(metrics.bid)} />
          <RevRow
            label="Total"
            pmpe={pmpe(
              metrics.inflPmpe +
                metrics.mevPmpe +
                metrics.blkPmpe +
                metrics.bid,
            )}
            severity="ok"
          />

          <SectionHeader title="Bid gap" colSpan={4} />
          <RevRow label="Static bid PMPE" pmpe={pmpe(metrics.bid)} />
          <RevRow
            label="Auction effective bid PMPE"
            pmpe={pmpe(metrics.effBid)}
          />
          <RevRow
            label="Total bid gap"
            pmpe={pmpe(metrics.bidGap)}
            severity={
              metrics.bidGap > 2
                ? 'warning'
                : metrics.bidGap === 0
                  ? 'ok'
                  : undefined
            }
          />

          <SectionHeader title="Cost" colSpan={4} />
          <RevRow label="Active Stake Cost" value={cost(metrics.cost)} />
          <RevRow
            label="Activating Stake Cost"
            pmpe={pmpe(metrics.activatingStakePmpe)}
            value={cost(metrics.activatingCost)}
          />
          <RevRow
            label="Total"
            value={cost(metrics.total)}
            total
            severity="ok"
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

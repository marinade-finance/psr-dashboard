import React from 'react'

import { cn } from 'src/class_utils'
import { CalcCard } from 'src/components/breakdowns/card'
import { pct } from 'src/format'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { ApyBreakdownValue } from 'src/services/tip-engine'

interface ApyCompositionCardProps {
  apyBreakdown: ApyBreakdownValue
  winningApy: number
  validator: AuctionValidator
  guideTo?: string
  isSimulated?: boolean
  onGoToBidding?: () => void
}

type Row = {
  label: string
  apy: number
  pmpe: number
  swatch: string
  context: string
}

export const ApyCompositionCard: React.FC<ApyCompositionCardProps> = ({
  apyBreakdown,
  winningApy,
  validator,
  guideTo,
  isSimulated,
  onGoToBidding,
}) => {
  // Simulation can null any commission field. Default to 0 so the rendered
  // percentage stays "0%" instead of "NaN%".
  const inflComm = validator.inflationCommissionDec ?? 0
  const mevComm = validator.mevCommissionDec ?? 0
  const blockComm = validator.blockRewardsCommissionDec ?? 0

  const r = validator.revShare
  // Bar widths use raw PMPE (linear, sums to totalPmpe); the displayed % is
  // the compounded APY for that component (non-linear, won't sum to total).
  const totalPmpe = r.totalPmpe
  const rows: Row[] = [
    {
      label: 'Inflation',
      apy: apyBreakdown.inflation,
      pmpe: r.inflationPmpe,
      swatch: 'bg-chart-1',
      context: `${pct(inflComm, 0)} commission`,
    },
    {
      label: 'MEV',
      apy: apyBreakdown.mev,
      pmpe: r.mevPmpe,
      swatch: 'bg-chart-2',
      context: `${pct(mevComm, 0)} commission`,
    },
    {
      label: 'Block rewards',
      apy: apyBreakdown.blockRewards,
      pmpe: r.blockPmpe ?? 0,
      swatch: 'bg-chart-3',
      context: `${pct(blockComm, 0)} shared`,
    },
    {
      label: 'Static bid',
      apy: apyBreakdown.staticBid,
      pmpe: r.bidPmpe,
      swatch: 'bg-chart-4',
      context: 'your bid',
    },
  ]

  // Two scales: PMPE for the per-row bars (linear, sums to totalPmpe);
  // APY for the Total bar (so the winning marker anchors against the total
  // APY shown to the right).
  const apyScale = Math.max(apyBreakdown.total, winningApy) * 1.2
  const winPct = (winningApy / apyScale) * 100
  const delta = apyBreakdown.total - winningApy
  const above = delta >= 0

  return (
    <CalcCard
      title="Max APY Composition"
      guideTo={guideTo}
      isSimulated={isSimulated}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          Winning APY threshold {pct(winningApy, 2)}
        </p>
        {above || !onGoToBidding ? (
          <span
            className={cn(
              'text-xs font-mono font-semibold px-2 py-0.5 rounded-md border',
              above
                ? 'bg-primary-light text-primary border-primary'
                : 'bg-destructive-light text-destructive border-destructive',
            )}
          >
            {above ? '+' : ''}
            {pct(delta, 2)} vs winning
          </span>
        ) : (
          // The pill IS the metric. The action label sits above as an
          // auxiliary hint so the pill chrome stays clean. Whole stack is
          // one click target.
          <button
            type="button"
            onClick={onGoToBidding}
            className="group flex flex-col items-end gap-0.5 cursor-pointer"
          >
            <span className="text-2xs text-destructive font-medium leading-none group-hover:underline">
              Fix in Bidding ↗
            </span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md border bg-destructive-light text-destructive border-destructive">
              {pct(delta, 2)} vs winning
            </span>
            <span className="sr-only">
              see the target bid on the Bidding tab
            </span>
          </button>
        )}
      </div>
      <div className="space-y-2">
        {rows.map(({ label, apy, pmpe, swatch, context }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-sm shrink-0', swatch)} />
            <div className="w-24 shrink-0">
              <div className="text-sm text-muted-foreground leading-tight">
                {label}
              </div>
              <div className="text-xs text-muted-foreground/70 font-mono leading-tight">
                {context}
              </div>
            </div>
            <div className="flex-1 relative h-3 bg-secondary rounded">
              <div
                className={cn('h-full rounded', swatch)}
                style={{
                  width:
                    totalPmpe > 0
                      ? `${Math.max(0, (pmpe / totalPmpe) * 100)}%`
                      : '0%',
                }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-12 text-right shrink-0">
              {pct(apy, 2)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-border-grid">
          <span className="w-2 shrink-0" />
          <span className="text-sm font-semibold w-24 shrink-0">Total</span>
          <div className="flex-1 relative h-4 bg-secondary rounded overflow-visible">
            <div
              className="h-full rounded overflow-hidden flex"
              style={{
                width: `${(apyBreakdown.total / apyScale) * 100}%`,
              }}
            >
              {totalPmpe > 0 &&
                rows.map(({ label, pmpe, swatch }) =>
                  pmpe > 0 ? (
                    <div
                      key={label}
                      className={cn('shrink-0', swatch)}
                      style={{ width: `${(pmpe / totalPmpe) * 100}%` }}
                    />
                  ) : null,
                )}
            </div>
            <div
              className="absolute top-[-3px] h-[calc(100%+6px)] w-0.5 rounded-full bg-foreground/50"
              style={{ left: `${winPct}%` }}
            />
            <span
              className="absolute top-[-18px] text-xs font-mono text-muted-foreground"
              style={{ left: `${winPct}%`, transform: 'translateX(-50%)' }}
            >
              {pct(winningApy, 2)}
            </span>
          </div>
          <span
            className={cn(
              'text-xs font-mono font-semibold w-12 text-right shrink-0',
              above ? 'text-primary' : 'text-destructive',
            )}
          >
            {pct(apyBreakdown.total, 2)}
          </span>
        </div>
      </div>
    </CalcCard>
  )
}

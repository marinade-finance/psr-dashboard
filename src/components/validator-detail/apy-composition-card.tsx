import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatPercentage } from 'src/format'
import {
  CSS_PRIMARY,
  CSS_DESTRUCTIVE,
  CSS_PRIMARY_LIGHT,
  CSS_DESTRUCTIVE_LIGHT,
} from 'src/lib/utils'
import { HELP_TEXT } from 'src/services/help-text'

import type { ApyBreakdownDisplay } from 'src/services/tip-engine'

interface ApyCompositionCardProps {
  rank: number
  totalValidators: number
  apyBreakdown: ApyBreakdownDisplay
  winningApy: number
}

export const ApyCompositionCard: React.FC<ApyCompositionCardProps> = ({
  rank,
  totalValidators,
  apyBreakdown,
  winningApy,
}) => {
  const scale = Math.max(apyBreakdown.total, winningApy) * 1.2
  const winPct = (winningApy / scale) * 100
  const rows: [string, number, string][] = [
    ['Inflation', apyBreakdown.inflation, 'var(--chart-1)'],
    ['MEV', apyBreakdown.mev, 'var(--chart-2)'],
    ['Block rewards', apyBreakdown.blockRewards, 'var(--chart-3)'],
    ['Stake bid', apyBreakdown.stakeBid, 'var(--chart-4)'],
  ]

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            Max APY Composition
            <HelpTip text={HELP_TEXT.maxApy} />
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rank #{rank} of {totalValidators} · winning threshold{' '}
            {formatPercentage(winningApy, 2)}
          </p>
        </div>
        {(() => {
          const delta = apyBreakdown.total - winningApy
          const above = delta >= 0
          return (
            <span
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{
                background: above ? CSS_PRIMARY_LIGHT : CSS_DESTRUCTIVE_LIGHT,
                color: above ? CSS_PRIMARY : CSS_DESTRUCTIVE,
              }}
            >
              {above ? '+' : ''}
              {formatPercentage(delta, 2)} vs winning
            </span>
          )
        })()}
      </div>
      <div className="space-y-2">
        {rows.map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground w-24 shrink-0">
              {label}
            </span>
            <div className="flex-1 relative h-3 bg-secondary rounded">
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.max(0, (val / scale) * 100)}%`,
                  background: color,
                }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-12 text-right shrink-0">
              {formatPercentage(val, 2)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-border-grid">
          <span className="text-[13px] font-semibold w-24 shrink-0">Total</span>
          <div className="flex-1 relative h-4 bg-secondary rounded overflow-visible">
            <div
              className="h-full rounded"
              style={{
                width: `${(apyBreakdown.total / scale) * 100}%`,
                background:
                  apyBreakdown.total >= winningApy
                    ? CSS_PRIMARY
                    : CSS_DESTRUCTIVE,
              }}
            />
            {/* winning APY threshold marker — only meaningful on the total */}
            <div
              className="absolute top-[-3px] h-[calc(100%+6px)] w-0.5 rounded-full bg-foreground/50"
              style={{ left: `${winPct}%` }}
            />
            <span
              className="absolute top-[-18px] text-[10px] font-mono text-muted-foreground"
              style={{
                left: `${winPct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {formatPercentage(winningApy, 2)}
            </span>
          </div>
          <span
            className="text-xs font-mono font-semibold w-12 text-right shrink-0"
            style={{
              color:
                apyBreakdown.total >= winningApy
                  ? CSS_PRIMARY
                  : CSS_DESTRUCTIVE,
            }}
          >
            {formatPercentage(apyBreakdown.total, 2)}
          </span>
        </div>
      </div>
    </div>
  )
}

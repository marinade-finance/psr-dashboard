import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatPercentage } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { ApyBreakdownDisplay } from 'src/services/tip-engine'

interface ApyCompositionCardProps {
  apyBreakdown: ApyBreakdownDisplay
  winningApy: number
  validator: AuctionValidator
}

type Row = {
  label: string
  value: number
  swatch: string
  context: string
}

export const ApyCompositionCard: React.FC<ApyCompositionCardProps> = ({
  apyBreakdown,
  winningApy,
  validator,
}) => {
  const inflComm = validator.inflationCommissionDec * 100
  const mevComm =
    validator.mevCommissionDec !== null ? validator.mevCommissionDec * 100 : 0
  const blockComm =
    validator.blockRewardsCommissionDec !== null
      ? validator.blockRewardsCommissionDec * 100
      : 0

  const rows: Row[] = [
    {
      label: 'Inflation',
      value: apyBreakdown.inflation,
      swatch: 'bg-chart-1',
      context: `${inflComm.toFixed(0)}% commission`,
    },
    {
      label: 'MEV',
      value: apyBreakdown.mev,
      swatch: 'bg-chart-2',
      context: `${mevComm.toFixed(0)}% commission`,
    },
    {
      label: 'Block rewards',
      value: apyBreakdown.blockRewards,
      swatch: 'bg-chart-3',
      context: `${blockComm.toFixed(0)}% shared`,
    },
    {
      label: 'Stake bid',
      value: apyBreakdown.stakeBid,
      swatch: 'bg-chart-4',
      context: 'your bid',
    },
  ]

  const scale = Math.max(apyBreakdown.total, winningApy) * 1.2
  const winPct = (winningApy / scale) * 100
  const delta = apyBreakdown.total - winningApy
  const above = delta >= 0

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            Max APY Composition
            <HelpTip text={HELP_TEXT.maxApy} />
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Winning threshold {formatPercentage(winningApy, 2)}
          </p>
        </div>
        <span
          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
            above
              ? 'bg-primary-light text-primary'
              : 'bg-destructive-light text-destructive'
          }`}
        >
          {above ? '+' : ''}
          {formatPercentage(delta, 2)} vs winning
        </span>
      </div>
      <div className="space-y-2">
        {rows.map(({ label, value, swatch, context }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-sm shrink-0 ${swatch}`} />
            <div className="w-24 shrink-0">
              <div className="text-[13px] text-muted-foreground leading-tight">
                {label}
              </div>
              <div className="text-[10px] text-muted-foreground/70 font-mono leading-tight">
                {context}
              </div>
            </div>
            <div className="flex-1 relative h-3 bg-secondary rounded">
              <div
                className={`h-full rounded ${swatch}`}
                style={{ width: `${Math.max(0, (value / scale) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-12 text-right shrink-0">
              {formatPercentage(value, 2)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-border-grid">
          <span className="w-2 shrink-0" />
          <span className="text-[13px] font-semibold w-24 shrink-0">Total</span>
          <div className="flex-1 relative h-4 bg-secondary rounded overflow-visible">
            <div
              className="h-full rounded overflow-hidden flex"
              style={{ width: `${(apyBreakdown.total / scale) * 100}%` }}
            >
              {apyBreakdown.total > 0 &&
                rows.map(({ label, value, swatch }) =>
                  value > 0 ? (
                    <div
                      key={label}
                      className={`shrink-0 ${swatch}`}
                      style={{
                        width: `${(value / apyBreakdown.total) * 100}%`,
                      }}
                    />
                  ) : null,
                )}
            </div>
            <div
              className="absolute top-[-3px] h-[calc(100%+6px)] w-0.5 rounded-full bg-foreground/50"
              style={{ left: `${winPct}%` }}
            />
            <span
              className="absolute top-[-18px] text-[10px] font-mono text-muted-foreground"
              style={{ left: `${winPct}%`, transform: 'translateX(-50%)' }}
            >
              {formatPercentage(winningApy, 2)}
            </span>
          </div>
          <span
            className={`text-xs font-mono font-semibold w-12 text-right shrink-0 ${
              above ? 'text-primary' : 'text-destructive'
            }`}
          >
            {formatPercentage(apyBreakdown.total, 2)}
          </span>
        </div>
      </div>
    </div>
  )
}

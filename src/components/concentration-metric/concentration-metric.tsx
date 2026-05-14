import React, { useState } from 'react'

import { cn } from 'src/class_utils'
import { pct, sol } from 'src/format'

import type { ConcentrationRow } from 'src/services/sam'

type Props = {
  label: string
  rows: ConcentrationRow[]
  capPct: number
  help?: string
}

const TOP_N = 3
const TOOLTIP_N = 15

const BAR_TONES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3']

export const ConcentrationMetric: React.FC<Props> = ({
  label,
  rows,
  capPct,
  help,
}) => {
  const [open, setOpen] = useState(false)
  const top = rows.slice(0, TOP_N)
  const tipRows = rows.slice(0, TOOLTIP_N)
  const remaining = rows.length - tipRows.length

  return (
    <div
      className="relative flex flex-col gap-1.5 px-3 py-2 bg-card rounded-md border border-border-grid"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {help && (
          <span className="text-[10px] text-muted-foreground/60" title={help}>
            ?
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {top.map((r, i) => {
          const fill = capPct > 0 ? Math.min(r.pctOfTotal / capPct, 1) * 100 : 0
          const barClass = r.atCap
            ? 'bg-destructive'
            : (BAR_TONES[i] ?? 'bg-chart-1')
          const textClass = r.atCap
            ? 'text-destructive font-semibold'
            : 'text-foreground'
          return (
            <div
              key={r.key}
              className="relative h-5 flex items-center text-[13px]"
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 rounded-sm opacity-25',
                  barClass,
                )}
                style={{ width: `${fill}%` }}
                aria-hidden
              />
              <span
                className={cn('relative truncate pl-1 pr-2 flex-1', textClass)}
                title={r.key}
              >
                {r.key}
                {r.atCap && <span className="ml-1.5 font-bold">(capped)</span>}
              </span>
              <span
                className={cn(
                  'relative font-mono text-xs pr-1',
                  r.atCap ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {pct(r.pctOfTotal)}
              </span>
            </div>
          )
        })}
      </div>

      {open && rows.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-1 w-[min(520px,90vw)] max-h-[60vh] overflow-y-auto bg-card border border-border rounded-md shadow-xl p-3 text-xs">
          <div className="text-muted-foreground mb-2 leading-snug">
            Cap: {pct(capPct)} of network stake. Bar fills against the cap.
          </div>
          <table className="w-full">
            <thead className="text-muted-foreground/70 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left py-1 font-medium">Name</th>
                <th className="text-right py-1 font-medium">Share</th>
                <th className="text-right py-1 font-medium">Stake</th>
                <th className="text-right py-1 font-medium">Cap</th>
              </tr>
            </thead>
            <tbody>
              {tipRows.map((r, i) => {
                const swatch = r.atCap
                  ? 'bg-destructive'
                  : (BAR_TONES[i] ?? 'bg-chart-1')
                return (
                  <tr
                    key={r.key}
                    className={r.atCap ? 'text-destructive font-semibold' : ''}
                  >
                    <td className="py-0.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-block w-[3px] h-3 rounded-sm shrink-0',
                          swatch,
                        )}
                      />
                      <span className="truncate">{r.key}</span>
                      <span className="text-muted-foreground/60 ml-1">
                        ({r.validatorCount})
                      </span>
                    </td>
                    <td className="text-right font-mono py-0.5">
                      {pct(r.pctOfTotal)}
                    </td>
                    <td className="text-right font-mono py-0.5 opacity-75">
                      ☉{sol(Math.round(r.samStakeSol))}
                    </td>
                    <td className="text-right py-0.5">
                      {r.atCap ? (
                        <span className="font-bold">
                          (capped) {r.cappedValidatorCount}
                        </span>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {remaining > 0 && (
            <div className="text-muted-foreground/60 mt-2">
              +{remaining} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}

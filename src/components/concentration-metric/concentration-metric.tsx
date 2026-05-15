import React, { useState } from 'react'

import { cn } from 'src/class_utils'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { Card } from 'src/components/ui/card'
import { pct, sol } from 'src/format'

import type { ConcentrationRow } from 'src/services/sam'

type Props = {
  label: string
  rows: ConcentrationRow[]
  capPct: number
  help?: string
  guideTo?: string
}

const TOP_N = 3
const TOOLTIP_N = 15

const BAR_TONE_DEFAULT = 'bg-chart-1'
const BAR_TONES = [BAR_TONE_DEFAULT, 'bg-chart-2', 'bg-chart-3']

// Rows 0-2 keep their identity hue (matches the top-3 mini view). Rows 3+
// are a single fading tail: alternate the two "next" palette hues and decay
// opacity every two rows so a long list trails off instead of repeating one
// flat colour. Floor keeps the longest tails faintly visible.
// Bars sit ~30% lighter than the text so the value stays the focus; no
// Tailwind step lands on 0.175, so the arbitrary value is intentional.
const BAR_OPACITY_BASE = 'opacity-[0.175]'
const TAIL_TONES = ['bg-chart-4', 'bg-chart-5']
const TAIL_OPACITY = [
  BAR_OPACITY_BASE,
  'opacity-[0.14]',
  'opacity-[0.105]',
  'opacity-[0.07]',
]

const barTone = (i: number): { tone: string; opacity: string } => {
  if (i < BAR_TONES.length)
    return { tone: BAR_TONES[i], opacity: BAR_OPACITY_BASE }
  const t = i - BAR_TONES.length
  return {
    tone: TAIL_TONES[t % TAIL_TONES.length],
    opacity:
      TAIL_OPACITY[
        Math.min(Math.floor(t / TAIL_TONES.length), TAIL_OPACITY.length - 1)
      ],
  }
}

export const ConcentrationMetric: React.FC<Props> = ({
  label,
  rows,
  capPct,
  help,
  guideTo,
}) => {
  const [open, setOpen] = useState(false)
  const top = rows.slice(0, TOP_N)
  const tipRows = rows.slice(0, TOOLTIP_N)
  const remaining = rows.length - tipRows.length

  return (
    <Card
      className="relative flex flex-col px-3 py-3 sm:px-5 sm:py-4 overflow-visible"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {help && <HelpTip text={help} guideTo={guideTo} />}
      </div>
      <div className="flex flex-col gap-0.5">
        {top.map((r, i) => {
          const fill = capPct > 0 ? Math.min(r.pctOfTotal / capPct, 1) * 100 : 0
          const barClass = r.atCap
            ? 'bg-destructive'
            : (BAR_TONES[i] ?? BAR_TONE_DEFAULT)
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
                  'absolute inset-y-0 left-0 rounded-sm',
                  BAR_OPACITY_BASE,
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
        <div className="absolute z-30 top-full inset-x-0 mt-1 max-h-[60vh] overflow-y-auto bg-card border border-border rounded-md shadow-xl p-3 text-xs">
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
                const fill =
                  capPct > 0 ? Math.min(r.pctOfTotal / capPct, 1) * 100 : 0
                const { tone, opacity } = barTone(i)
                const swatch = r.atCap ? 'bg-destructive' : tone
                const barOpacity = r.atCap ? BAR_OPACITY_BASE : opacity
                return (
                  <tr
                    key={r.key}
                    className={r.atCap ? 'text-destructive font-semibold' : ''}
                  >
                    <td className="relative py-0.5 pr-2">
                      <span
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-sm',
                          barOpacity,
                          swatch,
                        )}
                        style={{ width: `${fill}%` }}
                        aria-hidden
                      />
                      <span className="relative flex items-center gap-1.5">
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
    </Card>
  )
}

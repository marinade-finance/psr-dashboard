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

const TOOLTIP_N = 15

const BAR_TONE_DEFAULT = 'bg-chart-1'
const BAR_TONES = [BAR_TONE_DEFAULT, 'bg-chart-2', 'bg-chart-3']

// Rows 0-2 keep their identity hue (matches the top-3 mini view). Rows 3+
// are a single fading tail: one hue not used by the top-3 (chart-5), with
// opacity decaying every row so a long list trails off into the background.
// A floor keeps the longest tails faintly visible.
// Bars sit ~30% lighter than the text so the value stays the focus; no
// Tailwind step lands on 0.175, so the arbitrary value is intentional.
const BAR_OPACITY_BASE = 'opacity-[0.175]'
const TAIL_TONE = 'bg-chart-5'
const TAIL_OPACITY = [
  'opacity-[0.155]',
  'opacity-[0.135]',
  'opacity-[0.115]',
  'opacity-[0.1]',
  'opacity-[0.085]',
  'opacity-[0.07]',
  'opacity-[0.055]',
]

const barTone = (i: number): { tone: string; opacity: string } => {
  if (i < BAR_TONES.length)
    return { tone: BAR_TONES[i], opacity: BAR_OPACITY_BASE }
  const t = i - BAR_TONES.length
  return {
    tone: TAIL_TONE,
    opacity: TAIL_OPACITY[Math.min(t, TAIL_OPACITY.length - 1)],
  }
}

// Inline view matches the stat-tile chrome (label + big value + unit), so
// the headline row reads as one consistent set of metrics. The full bar
// list with cap marker lives only inside the hover popover, which keeps
// its original wider layout regardless of the tile's collapsed width.
export const ConcentrationMetric: React.FC<Props> = ({
  label,
  rows,
  capPct,
  help,
  guideTo,
}) => {
  const [open, setOpen] = useState(false)
  const top = rows.length > 0 ? rows[0] : null
  const anyCapped = rows.some(r => r.atCap)
  const tipRows = rows.slice(0, TOOLTIP_N)
  const remaining = rows.length - tipRows.length

  // Absolute share scale (not cap-relative): the track runs 0..scale where
  // scale leaves headroom past whichever is larger, the cap or the biggest
  // entry. This puts the cap marker at a real interior position and lets an
  // over-cap entry visibly extend PAST it (cap-relative scaling would pin
  // the marker to the right edge and clamp overflow).
  const maxShare = top?.pctOfTotal ?? 0
  const scale = Math.max(maxShare, capPct) * 1.12
  const barPct = (v: number) => (scale > 0 ? (v / scale) * 100 : 0)
  const capLeft = barPct(capPct)

  const nameClass = cn(
    'text-sm font-medium font-mono truncate min-w-0',
    anyCapped ? 'text-destructive' : 'text-muted-foreground',
  )
  const shareClass = cn(
    'text-xl sm:text-2xl font-semibold font-mono shrink-0',
    anyCapped ? 'text-destructive' : 'text-foreground',
  )

  return (
    <Card
      className="relative px-3 py-3 sm:px-5 sm:py-4 flex-1 min-w-[140px] sm:min-w-[160px] overflow-visible"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {help && <HelpTip text={help} guideTo={guideTo} />}
      </div>
      {top ? (
        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
          <span className={nameClass} title={top.key}>
            {top.key}
            {anyCapped && (
              <span className="ml-1 text-[10px] font-bold">(capped)</span>
            )}
          </span>
          <span className="flex items-baseline shrink-0 ml-auto">
            <span className={shareClass}>{pct(top.pctOfTotal)}</span>
            <span className="text-sm text-muted-foreground font-mono shrink-0">
              {' '}/{pct(capPct)}
            </span>
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1 min-w-0 overflow-hidden">
          <span className="text-xl sm:text-2xl font-semibold text-muted-foreground font-mono">
            —
          </span>
        </div>
      )}

      {open && rows.length > 0 && (
        <div className="absolute z-30 top-full right-0 mt-1 w-[640px] max-w-[calc(100vw-3rem)] max-h-[60vh] overflow-y-auto bg-card border border-border rounded-md shadow-xl p-3 text-xs">
          <div className="text-muted-foreground mb-2 leading-snug">
            Cap: {pct(capPct)} of network stake. The marker shows the cap; bars
            past it are over.
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
                const fill = barPct(r.pctOfTotal)
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
                      {capLeft > 0 && capLeft <= 100 && (
                        <>
                          <span
                            className="absolute inset-y-0 w-0.5 rounded-full bg-foreground/50 pointer-events-none"
                            style={{ left: `${capLeft}%` }}
                            aria-hidden
                          />
                          {i === 0 && (
                            <span
                              className="absolute top-[-13px] text-[10px] font-mono text-muted-foreground pointer-events-none"
                              style={{
                                left: `${capLeft}%`,
                                transform: 'translateX(-50%)',
                              }}
                            >
                              {pct(capPct)}
                            </span>
                          )}
                        </>
                      )}
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

import React, { useState } from 'react'

import { cn } from 'src/class_utils'
import { Gauge } from 'src/components/gauge/gauge'
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

export const ConcentrationMetric: React.FC<Props> = ({
  label,
  rows,
  capPct,
  help,
  guideTo,
}) => {
  const [open, setOpen] = useState(false)
  // Inline view shows only what matters at a glance: every over-cap entry
  // if any are capped, otherwise just the #1. The full ranked list lives in
  // the hover popover. rows is sorted by stake desc, so capped stays ranked.
  const capped = rows.filter(r => r.atCap)
  const inline = capped.length > 0 ? capped : rows.slice(0, 1)
  const tipRows = rows.slice(0, TOOLTIP_N)
  const remaining = rows.length - tipRows.length

  // Absolute share scale (not cap-relative): the track runs 0..scale where
  // scale leaves headroom past whichever is larger, the cap or the biggest
  // entry. This puts the cap marker at a real interior position and lets an
  // over-cap entry visibly extend PAST it (cap-relative scaling would pin
  // the marker to the right edge and clamp overflow). rows[0] is the max
  // (sorted by stake desc). Same scale drives inline and popover bars.
  const maxShare = rows.length > 0 ? rows[0].pctOfTotal : 0
  const scale = Math.max(maxShare, capPct) * 1.12
  const barPct = (v: number) => (scale > 0 ? (v / scale) * 100 : 0)
  const capLeft = barPct(capPct)

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
      <div className="flex flex-col gap-3 mt-2">
        {inline.map((r, i) => {
          const tone = r.atCap
            ? 'bg-destructive'
            : (BAR_TONES[i] ?? BAR_TONE_DEFAULT)
          const textClass = r.atCap
            ? 'text-destructive font-semibold'
            : 'text-foreground'
          return (
            <div key={r.key} className="flex flex-col gap-1">
              <div className="flex items-baseline text-[13px]">
                <span
                  className={cn('truncate pr-2 flex-1', textClass)}
                  title={r.key}
                >
                  {r.key}
                  {r.atCap && (
                    <span className="ml-1.5 font-bold">(capped)</span>
                  )}
                </span>
                <span
                  className={cn(
                    'font-mono text-xs',
                    r.atCap ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {pct(r.pctOfTotal)}
                </span>
              </div>
              <Gauge
                size="lg"
                value={r.pctOfTotal}
                scaleMax={scale}
                marker={capPct > 0 ? capPct / scale : undefined}
                tone={tone}
                markerTone="bg-foreground/50"
              />
            </div>
          )
        })}
        {capLeft > 0 && capLeft <= 100 && (
          <div className="text-[10px] font-mono text-muted-foreground -mt-1">
            {pct(capPct)} cap
          </div>
        )}
      </div>

      {open && rows.length > 0 && (
        <div className="absolute z-30 top-full inset-x-0 mt-1 max-h-[60vh] overflow-y-auto bg-card border border-border rounded-md shadow-xl p-3 text-xs">
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

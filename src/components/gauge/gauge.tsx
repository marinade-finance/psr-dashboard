import React from 'react'

import { cn } from 'src/class_utils'

// One shared track-and-fill gauge. Extracted verbatim from the sam-table
// bond pill (commit 63a99637) so the bond column and the concentration
// top-metric draw the same graphic at two sizes. Dumb/presentational:
// the caller owns value/scale/marker/tone semantics.
type Size = 'sm' | 'lg'

type Props = {
  // Fill = clamp(value / scaleMax) — never below 4% so a non-zero value
  // always reads as present.
  value: number
  scaleMax: number
  // Optional thin tick at this fraction of the track (0..1).
  marker?: number
  // Semantic colour class for the fill (e.g. BOND_CHIP[tier].bar).
  tone: string
  // Semantic colour class for the marker tick (default destructive).
  markerTone?: string
  size?: Size
  className?: string
}

const TRACK: Record<Size, string> = {
  sm: 'h-1 w-14',
  lg: 'h-2.5 w-full',
}

const TICK: Record<Size, string> = {
  sm: 'inset-y-[-2px] w-0.5',
  lg: 'inset-y-[-3px] w-[3px]',
}

export const Gauge: React.FC<Props> = ({
  value,
  scaleMax,
  marker,
  tone,
  markerTone = 'bg-destructive',
  size = 'sm',
  className,
}) => {
  const fill =
    scaleMax > 0 ? Math.max(Math.min((value / scaleMax) * 100, 100), 4) : 4
  const markerLeft =
    marker === undefined ? null : Math.max(Math.min(marker * 100, 100), 2)
  return (
    <div
      className={cn(
        'relative bg-secondary rounded-sm shrink-0',
        TRACK[size],
        className,
      )}
    >
      <div
        className={cn('absolute inset-y-0 left-0 rounded-sm', tone)}
        style={{ width: `${fill}%` }}
      />
      {markerLeft !== null && (
        <div
          className={cn('absolute rounded-full', TICK[size], markerTone)}
          style={{ left: `${markerLeft}%` }}
        />
      )}
    </div>
  )
}

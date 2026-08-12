import React from 'react'

import { cn } from 'src/class_utils'

// One shared part-to-whole donut. Dumb/presentational in the same sense as
// `gauge.tsx`: the caller owns ordering, colour and what the centre says. It
// only turns values into arcs.
//
// Segment count is the caller's problem, but keep it at or under 6 — past that
// a donut stops being readable and the data belongs in a table.

export type DonutSegment = {
  label: string
  value: number
  // Any CSS colour — in practice a `var(--rank-N)` string from `css.ts`.
  color: string
}

type Props = {
  segments: DonutSegment[]
  // Rendered in the hole. The caller swaps this on hover.
  children?: React.ReactNode
  onHover?: (index: number | null) => void
  hoveredIndex?: number | null
  className?: string
  // Accessible name for the figure as a whole.
  ariaLabel: string
}

// SVG user units. The ring is drawn as one circle per segment, each with a
// dash pattern that exposes only its own arc — simpler and more robust than
// building arc paths, and gaps fall out of the dash arithmetic for free.
const VIEWBOX = 100
const RADIUS = 38
const STROKE = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A 2px surface gap between fills, per the mark spec: segments are separated
// by the surface showing through, never by a drawn border.
const GAP = 2

// Thinnest stroke a sub-gap segment keeps, so a tiny-but-present share still
// reads as present rather than vanishing into the gap.
const HAIRLINE = 0.5

export type SegmentArc = {
  index: number
  // Arc length actually stroked.
  drawn: number
  // Where this segment's arc starts, measured along the circumference.
  offset: number
}

// Pure geometry, exported for test. Two invariants matter and neither is
// visible from the rendered SVG:
//   1. `drawn` never exceeds the segment's own arc — a floor that overran it
//      would paint over the next segment and misplace every boundary after it.
//   2. A zero or negative value produces no arc at all, rather than the
//      hairline (which would show a segment for a value that isn't there).
export const layoutSegments = (
  values: number[],
  circumference: number,
  gap: number,
): SegmentArc[] => {
  const total = values.reduce((acc, v) => acc + Math.max(v, 0), 0)
  if (total <= 0) return []

  const arcs: SegmentArc[] = []
  let offset = 0

  values.forEach((rawValue, index) => {
    const value = Math.max(rawValue, 0)
    const arc = (value / total) * circumference
    if (value > 0) {
      arcs.push({
        index,
        drawn: Math.min(Math.max(arc - gap, HAIRLINE), arc),
        offset,
      })
    }
    offset += arc
  })

  return arcs
}

export const DonutChart: React.FC<Props> = ({
  segments,
  children,
  onHover,
  hoveredIndex = null,
  className,
  ariaLabel,
}) => {
  // A gap costs arc length, so it can only be spent where there is an arc to
  // spend it on. With one segment there is no boundary to mark at all.
  const gap = segments.length > 1 ? GAP : 0

  const arcs = layoutSegments(
    segments.map(s => s.value),
    CIRCUMFERENCE,
    gap,
  )

  return (
    <div className={cn('relative shrink-0', className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {arcs.map(({ index, drawn, offset }) => {
          const segment = segments[index]
          const dash = `${drawn} ${CIRCUMFERENCE - drawn}`
          const dimmed = hoveredIndex !== null && hoveredIndex !== index

          return (
            <circle
              key={`${segment.label}-${index}`}
              cx={VIEWBOX / 2}
              cy={VIEWBOX / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className={cn(
                'donutSegment transition-opacity duration-150',
                dimmed ? 'opacity-35' : 'opacity-100',
                onHover && 'cursor-default',
              )}
              onMouseEnter={() => onHover?.(index)}
              onMouseLeave={() => onHover?.(null)}
            >
              <title>{segment.label}</title>
            </circle>
          )
        })}
      </svg>
      {children && (
        // pointer-events-none so the hole never steals hover from the ring.
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          {children}
        </div>
      )}
    </div>
  )
}

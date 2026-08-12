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

export const DonutChart: React.FC<Props> = ({
  segments,
  children,
  onHover,
  hoveredIndex = null,
  className,
  ariaLabel,
}) => {
  const total = segments.reduce((acc, s) => acc + Math.max(s.value, 0), 0)

  // A gap costs arc length, so it can only be spent where there is an arc to
  // spend it on. With one segment there is no boundary to mark at all.
  const gap = segments.length > 1 ? GAP : 0

  let offset = 0

  return (
    <div className={cn('relative shrink-0', className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {total > 0 &&
          segments.map((segment, index) => {
            const fraction = Math.max(segment.value, 0) / total
            const arc = fraction * CIRCUMFERENCE
            // Never let the gap eat a whole slice: a sub-gap segment keeps a
            // hairline of colour so a tiny-but-present share still reads as
            // present, the way the gauge floors its fill at 4%.
            const drawn = Math.max(arc - gap, 0.5)
            const dash = `${drawn} ${CIRCUMFERENCE - drawn}`
            const thisOffset = offset
            offset += arc

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
                strokeDashoffset={-thisOffset}
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

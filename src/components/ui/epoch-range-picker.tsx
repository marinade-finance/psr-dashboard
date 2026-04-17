import React, { useEffect, useRef, useState } from 'react'

import { cn } from 'src/lib/utils'

const PAGE = 20

type Props = {
  epochs: number[]
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

export const EpochRangePicker: React.FC<Props> = ({
  epochs,
  min,
  max,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [draft, setDraft] = useState<{
    start: number | null
    end: number | null
  }>({
    start: min,
    end: max,
  })
  const [pageStart, setPageStart] = useState(() => {
    const idx = epochs.indexOf(min)
    return Math.max(0, idx - (idx % PAGE))
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft({ start: min, end: max })
  }, [min, max])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const visible = epochs.slice(pageStart, pageStart + PAGE)
  const canPrev = pageStart > 0
  const canNext = pageStart + PAGE < epochs.length

  const handleEpochClick = (ep: number) => {
    if (selecting === 'start') {
      setDraft({ start: ep, end: null })
      setSelecting('end')
    } else {
      const start = draft.start
      const [lo, hi] = ep < start ? [ep, start] : [start, ep]
      setDraft({ start: lo, end: hi })
      setSelecting('start')
      onChange(lo, hi)
      setOpen(false)
    }
  }

  const isInRange = (ep: number) => {
    const s = draft.start ?? min
    const e = draft.end ?? max
    return ep >= s && ep <= e
  }
  const isEdge = (ep: number) => ep === draft.start || ep === draft.end

  const label =
    draft.start === epochs[0] && draft.end === epochs[epochs.length - 1]
      ? 'All epochs'
      : `Epoch ${draft.start} – ${draft.end ?? '?'}`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-sm transition-colors',
          'hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-ring',
          open && 'border-primary/50 ring-1 ring-ring',
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          className="text-muted-foreground shrink-0"
        >
          <rect
            x="1"
            y="2"
            width="11"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path d="M1 5h11" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M4 1v2M9 1v2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-foreground">{label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="text-muted-foreground ml-1"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              {selecting === 'start'
                ? 'Select start epoch'
                : 'Select end epoch'}
            </span>
            <button
              type="button"
              onClick={() => {
                setDraft({ start: epochs[0], end: epochs[epochs.length - 1] })
                setSelecting('start')
                onChange(epochs[0], epochs[epochs.length - 1])
                setOpen(false)
              }}
              className="text-[11px] text-primary hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 mb-2">
            {visible.map(ep => {
              const inRange = isInRange(ep)
              const edge = isEdge(ep)
              return (
                <button
                  key={ep}
                  type="button"
                  onClick={() => handleEpochClick(ep)}
                  className={cn(
                    'h-8 rounded-md text-xs font-mono transition-colors',
                    edge && 'bg-primary text-primary-foreground font-semibold',
                    !edge && inRange && 'bg-primary/15 text-primary',
                    !edge && !inRange && 'text-foreground hover:bg-muted',
                  )}
                >
                  {ep}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPageStart(p => Math.max(0, p - PAGE))}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-2 py-1"
            >
              ← older
            </button>
            <span className="text-[11px] text-muted-foreground">
              {epochs[pageStart]}–
              {epochs[Math.min(pageStart + PAGE - 1, epochs.length - 1)]}
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() =>
                setPageStart(p => Math.min(epochs.length - PAGE, p + PAGE))
              }
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-2 py-1"
            >
              newer →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

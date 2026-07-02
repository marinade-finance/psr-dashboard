import React, { useEffect, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { ICON_CALENDAR } from 'src/components/icons/icon-calendar'
import { ICON_CHEVRON_DOWN_SM } from 'src/components/icons/icon-chevron-down-sm'
import { ICON_CHEVRON_LEFT } from 'src/components/icons/icon-chevron-left'
import { ICON_CHEVRON_RIGHT } from 'src/components/icons/icon-chevron-right'

const PANEL_SIZE = 30 // 6 cols × 5 rows
const CELL_BTN =
  'relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs font-mono transition-colors'
const CELL_WRAP = 'relative flex items-center justify-center h-9'

type CellState = 'edge-start' | 'edge-end' | 'in-range' | 'none'
const CS_EDGE_START: CellState = 'edge-start'
const CS_EDGE_END: CellState = 'edge-end'
const CS_IN_RANGE: CellState = 'in-range'

type Props = {
  epochs: number[]
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

type Draft = { start: number | null; end: number | null }

export const EpochRangePicker: React.FC<Props> = ({
  epochs,
  min,
  max,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [draft, setDraft] = useState<Draft>({ start: min, end: max })
  const [hoverEpoch, setHoverEpoch] = useState<number | null>(null)

  // pageStart is the index of the first epoch shown in the LEFT panel
  const [pageStart, setPageStart] = useState(() => {
    const idx = epochs.indexOf(min)
    const base = Math.max(0, idx - (idx % PANEL_SIZE))
    // Keep left panel up to PANEL_SIZE*2 from end so right panel is never empty
    return Math.min(base, Math.max(0, epochs.length - PANEL_SIZE * 2))
  })

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setDraft({ start: min, end: max })
  }, [min, max, open])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSelecting('start')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const leftEpochs = epochs.slice(pageStart, pageStart + PANEL_SIZE)
  const rightEpochs = epochs.slice(
    pageStart + PANEL_SIZE,
    pageStart + PANEL_SIZE * 2,
  )

  const canPrev = pageStart > 0
  const canNext = pageStart + PANEL_SIZE * 2 < epochs.length

  const pickStart = (ep: number) => {
    setDraft({ start: ep, end: null })
    setSelecting('end')
    setHoverEpoch(null)
  }

  const pickEnd = (ep: number) => {
    const start = draft.start
    if (start === null) {
      // No start picked yet — treat the click as the start instead.
      pickStart(ep)
      return
    }
    const [lo, hi] = ep < start ? [ep, start] : [start, ep]
    setDraft({ start: lo, end: hi })
    setSelecting('start')
    setHoverEpoch(null)
    onChange(lo, hi)
    setOpen(false)
  }

  const handleEpochClick = (ep: number) => {
    if (selecting === 'start') pickStart(ep)
    else pickEnd(ep)
  }

  // Effective range for rendering (includes hover preview)
  const hoverEnd =
    selecting === 'end' && hoverEpoch !== null ? hoverEpoch : null
  const effectiveStart =
    hoverEnd !== null
      ? Math.min(draft.start ?? hoverEnd, hoverEnd)
      : draft.start
  const effectiveEnd =
    hoverEnd !== null ? Math.max(draft.start ?? hoverEnd, hoverEnd) : draft.end

  function cellState(ep: number): CellState {
    const start = effectiveStart
    const end = effectiveEnd
    if (start === null || end === null)
      return ep === draft.start ? CS_EDGE_START : 'none'
    if (ep === start) return CS_EDGE_START
    if (ep === end) return CS_EDGE_END
    if (ep > start && ep < end) return CS_IN_RANGE
    return 'none'
  }

  function rowCol(panelEpochs: number[], ep: number) {
    return panelEpochs.indexOf(ep) % 6
  }

  const isAllEpochs =
    draft.start === epochs[0] && draft.end === epochs[epochs.length - 1]

  const triggerStartLabel =
    draft.start !== null ? `Epoch ${draft.start}` : 'Start epoch'
  const triggerEndLabel =
    draft.end !== null ? `Epoch ${draft.end}` : 'End epoch'

  function cellWrapperClass(ep: number, panelEpochs: number[]) {
    const state = cellState(ep)
    const inRange = state === CS_IN_RANGE
    const col = rowCol(panelEpochs, ep)
    const hasRange = effectiveEnd !== null && effectiveEnd !== effectiveStart
    if (inRange) {
      return cn(
        CELL_WRAP,
        'bg-primary/10',
        col === 0 && 'rounded-l-full',
        col === 5 && 'rounded-r-full',
      )
    }
    if (state === CS_EDGE_START && hasRange)
      return cn(CELL_WRAP, 'bg-gradient-to-r from-transparent to-primary/10')
    if (state === CS_EDGE_END && hasRange)
      return cn(CELL_WRAP, 'bg-gradient-to-l from-transparent to-primary/10')
    return CELL_WRAP
  }

  function cellBtnClass(ep: number) {
    const state = cellState(ep)
    const isEdge = state === CS_EDGE_START || state === CS_EDGE_END
    const inRange = state === CS_IN_RANGE
    return cn(
      CELL_BTN,
      isEdge && 'bg-primary text-primary-foreground font-semibold',
      !isEdge && inRange && 'text-primary hover:bg-primary/20',
      !isEdge && !inRange && 'text-foreground hover:bg-muted',
    )
  }

  function renderPanel(panelEpochs: number[], label: string) {
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2 px-2">
          {label}
        </div>
        <div className="grid grid-cols-6">
          {panelEpochs.map(ep => (
            <div key={ep} className={cellWrapperClass(ep, panelEpochs)}>
              <button
                type="button"
                onClick={() => handleEpochClick(ep)}
                onMouseEnter={() => setHoverEpoch(ep)}
                onMouseLeave={() => setHoverEpoch(null)}
                className={cellBtnClass(ep)}
              >
                {ep}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const leftLabel =
    leftEpochs.length > 0
      ? `${leftEpochs[0]}–${leftEpochs[leftEpochs.length - 1]}`
      : ''
  const rightLabel =
    rightEpochs.length > 0
      ? `${rightEpochs[0]}–${rightEpochs[rightEpochs.length - 1]}`
      : ''

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(isOpen => !isOpen)
          setSelecting('start')
        }}
        className={cn(
          'flex h-10 items-stretch rounded-xl border border-input bg-card shadow-sm transition-colors overflow-hidden',
          'hover:border-primary/50 focus:outline-none',
          open && 'border-primary ring-1 ring-primary/30',
        )}
      >
        <span className="flex items-center px-3 text-muted-foreground">
          {ICON_CALENDAR}
        </span>

        <span
          className={cn(
            'flex flex-col items-start justify-center px-3 py-1 text-left',
            open && selecting === 'start' && 'bg-primary/5',
          )}
        >
          <span className="text-2xs uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
            From
          </span>
          <span
            className={cn(
              'text-sm',
              draft.start !== null
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {triggerStartLabel}
          </span>
        </span>

        <span className="w-px bg-border self-stretch" />

        <span
          className={cn(
            'flex flex-col items-start justify-center px-3 py-1 text-left',
            open && selecting === 'end' && 'bg-primary/5',
          )}
        >
          <span className="text-2xs uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
            To
          </span>
          <span
            className={cn(
              'text-sm',
              draft.end !== null ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {triggerEndLabel}
          </span>
        </span>

        <span className="flex items-center px-2 text-muted-foreground">
          {ICON_CHEVRON_DOWN_SM}
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 w-[calc(100vw-2rem)] sm:w-[540px] right-0 sm:right-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              {selecting === 'start'
                ? 'Select start epoch'
                : 'Select end epoch'}
            </span>
            <button
              type="button"
              onClick={() => {
                const lo = epochs[0]
                const hi = epochs[epochs.length - 1]
                setDraft({ start: lo, end: hi })
                setSelecting('start')
                onChange(lo, hi)
                setOpen(false)
              }}
              className={cn(
                'text-xs hover:underline',
                isAllEpochs
                  ? 'text-muted-foreground/40 pointer-events-none'
                  : 'text-primary',
              )}
            >
              All epochs
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {renderPanel(leftEpochs, leftLabel)}
            <div className="hidden sm:block w-px bg-border self-stretch" />
            <div className="block sm:hidden h-px w-full bg-border" />
            {renderPanel(rightEpochs, rightLabel)}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPageStart(p => Math.max(0, p - PANEL_SIZE * 2))}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              {ICON_CHEVRON_LEFT}
              older
            </button>
            <span className="text-2xs text-muted-foreground">
              {epochs[pageStart]}–
              {
                epochs[
                  Math.min(pageStart + PANEL_SIZE * 2 - 1, epochs.length - 1)
                ]
              }
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() =>
                setPageStart(p =>
                  Math.min(epochs.length - PANEL_SIZE * 2, p + PANEL_SIZE * 2),
                )
              }
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              newer
              {ICON_CHEVRON_RIGHT}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useId, useRef, useState } from 'react'

import { Tooltip } from 'src/components/ui/tooltip'

type Props = {
  html?: string
  text?: string
  guideTo?: string
  // When given, the label content is wrapped together with the ? icon as a
  // single Radix trigger so hovering/clicking anywhere on "Label ?" works.
  // Omit it (icon-only) where the label is also a sort / click target —
  // wrapping it there would swallow that click.
  children?: React.ReactNode
}

const ICON_CLASSES =
  'text-xs leading-none text-muted-foreground/60 group-hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none shrink-0'

// Module-level singleton: only ONE HelpTip can be pinned globally. Pinning
// another closes the previous. Subscribers re-render off this. Survives the
// life of the page (re-mounts re-subscribe). Living here, not in a context,
// because HelpTips appear in slide-overs, tooltips, breakdowns — wiring
// every render tree through a provider would be over-engineering for one
// boolean.
type PinSubscriber = (pinnedId: string | null) => void
let currentPinnedId: string | null = null
const pinSubscribers = new Set<PinSubscriber>()
function setGlobalPinned(id: string | null) {
  currentPinnedId = id
  pinSubscribers.forEach(s => s(id))
}

// Hover previews the tip (Radix Tooltip). Click pins it open globally
// (singleton: pinning a second tip unpins the first). Clicking anywhere
// outside the trigger and the tooltip body dismisses the pin; Esc too.
// `Learn more ↗` opens the guide (stopPropagation so it doesn't unpin).
export const HelpTip: React.FC<Props> = ({ html, text, guideTo, children }) => {
  const id = useId()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Sync local pinned with the singleton.
  useEffect(() => {
    const sub: PinSubscriber = next => setPinned(next === id)
    pinSubscribers.add(sub)
    return () => {
      pinSubscribers.delete(sub)
    }
  }, [id])

  // Outside-click + Esc dismiss the global pin.
  useEffect(() => {
    if (!pinned) return undefined
    const onDown = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Element)) return
      // Inside the trigger? The button's onClick toggles — leave it alone.
      if (triggerRef.current?.contains(t)) return
      // Inside the tooltip body (Radix portals content with role="tooltip")?
      // Keep open so users can read it and click "Learn more".
      if (t.closest('[role="tooltip"]')) return
      setGlobalPinned(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGlobalPinned(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  const tooltipContent = (
    <span className="flex flex-col gap-1">
      {html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span>{text}</span>
      )}
      {guideTo && (
        <a
          href={guideTo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-xs font-medium mt-0.5"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          Learn more ↗
        </a>
      )}
    </span>
  )

  const icon = (
    <span className={ICON_CLASSES} aria-hidden="true">
      ?
    </span>
  )

  return (
    <Tooltip
      content={tooltipContent}
      open={pinned || hovered}
      onOpenChange={o => {
        if (!pinned) setHovered(o)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        // Buttons reset text-transform/letter-spacing/font in the UA
        // stylesheet, so a wrapped label would drop the parent's
        // uppercase/tracking/weight. Force every typographic property to
        // inherit so the label text stays byte-identical to before.
        className={
          children
            ? 'group inline-flex items-center gap-1.5 text-left align-baseline [text-transform:inherit] [letter-spacing:inherit] [font:inherit] [color:inherit]'
            : 'group inline-flex shrink-0'
        }
        aria-label={children ? undefined : 'More info'}
        aria-pressed={pinned}
        // Block Radix's pointerdown-dismiss so click toggles cleanly (no
        // close→reopen flicker against the controlled `open`).
        onPointerDown={e => e.preventDefault()}
        onClick={e => {
          e.stopPropagation()
          setGlobalPinned(currentPinnedId === id ? null : id)
        }}
      >
        {children}
        {icon}
      </button>
    </Tooltip>
  )
}

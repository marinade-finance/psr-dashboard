import React, { useState } from 'react'

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

// Hover previews the tip. Clicking the trigger pins it open; clicking it
// again or anywhere on the tip body unpins. The guide opens from the
// in-body "Learn more ↗" link (its own click is isolated so it doesn't
// unpin or bubble to the row). With `children`, the whole "Label ?" group
// is the trigger; without, just the ? icon (backwards-compat).
export const HelpTip: React.FC<Props> = ({ html, text, guideTo, children }) => {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)

  const tooltipContent = (
    <span className="flex flex-col gap-1" onClick={() => setPinned(false)}>
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
        type="button"
        // Buttons reset text-transform/letter-spacing/font in the UA
        // stylesheet, so a wrapped label would drop the parent's
        // uppercase/tracking/weight. Force every typographic property to
        // inherit so the label text stays byte-identical to before.
        className={
          children
            ? 'group inline-flex items-center gap-1.5 cursor-help text-left align-baseline [text-transform:inherit] [letter-spacing:inherit] [font:inherit] [color:inherit]'
            : 'group cursor-help inline-flex shrink-0'
        }
        aria-label={children ? undefined : 'More info'}
        aria-pressed={pinned}
        // Radix dismisses the tooltip on the trigger's pointerdown; with the
        // controlled open this causes a close→reopen flicker on click. Block
        // the pointerdown default so pinning toggles without the blink — the
        // click still fires.
        onPointerDown={e => e.preventDefault()}
        onClick={e => {
          e.stopPropagation()
          setPinned(p => !p)
        }}
      >
        {children}
        {icon}
      </button>
    </Tooltip>
  )
}

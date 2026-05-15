import React, { useState } from 'react'

import { Tooltip } from 'src/components/ui/tooltip'

type Props = {
  html?: string
  text?: string
  guideTo?: string
}

const ICON_CLASSES =
  'cursor-pointer text-[10px] leading-none text-muted-foreground/60 hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none shrink-0'

// Hover previews the tip. Clicking the ? pins it open; clicking the ?
// again or anywhere on the tip body unpins. The guide opens from the
// in-body "Learn more ↗" link (its own click is isolated so it doesn't
// unpin or bubble to the row).
export const HelpTip: React.FC<Props> = ({ html, text, guideTo }) => {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)

  const content = html ? (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span>{text}</span>
  )

  const tooltipContent = (
    <span className="flex flex-col gap-1" onClick={() => setPinned(false)}>
      {content}
      {guideTo && (
        <a
          href={guideTo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-[10px] font-medium mt-0.5"
          onClick={e => e.stopPropagation()}
        >
          Learn more ↗
        </a>
      )}
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
        className={ICON_CLASSES}
        aria-label="More info"
        aria-pressed={pinned}
        onClick={e => {
          e.stopPropagation()
          setPinned(p => !p)
        }}
      >
        ?
      </button>
    </Tooltip>
  )
}

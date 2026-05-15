import React from 'react'
import { Link } from 'react-router-dom'

import { Tooltip } from 'src/components/ui/tooltip'

type Props = {
  html?: string
  text?: string
  guideTo?: string
}

const ICON_CLASSES =
  'cursor-help text-[10px] leading-none text-muted-foreground/60 hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none shrink-0'

export const HelpTip: React.FC<Props> = ({ html, text, guideTo }) => {
  const content = html ? (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span>{text}</span>
  )

  const tooltipContent = guideTo ? (
    <span className="flex flex-col gap-1">
      {content}
      <Link
        to={guideTo}
        className="text-primary hover:underline text-[10px] font-medium mt-0.5"
        onClick={e => e.stopPropagation()}
      >
        Learn more →
      </Link>
    </span>
  ) : (
    content
  )

  if (guideTo) {
    return (
      <Tooltip content={tooltipContent}>
        <Link
          to={guideTo}
          className={ICON_CLASSES}
          aria-label="Learn more in the guide"
          onClick={e => e.stopPropagation()}
          tabIndex={0}
        >
          ?
        </Link>
      </Tooltip>
    )
  }

  return (
    <Tooltip content={tooltipContent}>
      <span className={ICON_CLASSES}>?</span>
    </Tooltip>
  )
}

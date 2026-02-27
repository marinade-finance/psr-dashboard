import React from 'react'

import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'

interface HelpTipProps {
  text: string
  children?: React.ReactNode
}

export const HelpTip = ({ text, children }: HelpTipProps) => {
  const content = text.split(/<br\s*\/?>/).map((line, i, arr) => (
    <React.Fragment key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ))

  const trigger = children ? (
    <span className="cursor-help">{children}</span>
  ) : (
    <span
      className="inline-flex items-center justify-center w-4 h-4 border border-border text-muted-foreground text-[9px] font-bold cursor-help ml-1 select-none font-mono"
      role="button"
      aria-label="Help"
    >
      ?
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}

import React from 'react'

import { Tooltip } from 'src/components/ui/tooltip'

type Props = {
  html?: string
  text?: string
}

export const HelpTip: React.FC<Props> = ({ html, text }) => (
  <Tooltip
    content={
      html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span>{text}</span>
      )
    }
  >
    <span className="cursor-help text-[10px] leading-none text-muted-foreground/60 hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none shrink-0">
      ?
    </span>
  </Tooltip>
)

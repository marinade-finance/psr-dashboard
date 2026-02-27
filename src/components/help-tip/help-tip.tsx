import React from 'react'

import { Tooltip, TooltipProvider } from 'src/components/ui/tooltip'

type Props = {
  html: string
}

export const HelpTip: React.FC<Props> = ({ html }) => (
  <TooltipProvider>
    <Tooltip content={<span dangerouslySetInnerHTML={{ __html: html }} />}>
      <span className="cursor-help text-[10px] leading-none text-muted-foreground/60 hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none">
        ?
      </span>
    </Tooltip>
  </TooltipProvider>
)

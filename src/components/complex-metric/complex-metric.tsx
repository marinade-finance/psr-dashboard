import React from 'react'

import { Tooltip, TooltipProvider } from 'src/components/ui/tooltip'

type Props = {
  label: string
  value: React.ReactNode
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const ComplexMetric: React.FC<Props> = ({
  label,
  value,
  'data-tooltip-html': tooltipHtml,
}) => {
  const inner = (
    <div className="metric px-5 py-2.5 bg-card cursor-help rounded-xl shadow-card border border-border-grid transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      <div className="whitespace-nowrap text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </div>
      <div className="metricValue whitespace-nowrap mt-2.5 text-2xl">
        {value}
      </div>
    </div>
  )

  if (!tooltipHtml) return inner

  return (
    <TooltipProvider>
      <Tooltip
        content={<span dangerouslySetInnerHTML={{ __html: tooltipHtml }} />}
      >
        {inner}
      </Tooltip>
    </TooltipProvider>
  )
}

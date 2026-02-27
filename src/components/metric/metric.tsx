import React from 'react'

import { Tooltip, TooltipProvider } from 'src/components/ui/tooltip'

type Props = {
  label: string
  value: React.ReactNode
  subtitle?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  subtitle,
  'data-tooltip-html': tooltipHtml,
}) => (
  <div className="metric px-5 py-2.5 bg-card rounded-xl shadow-card border border-border-grid transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-0 overflow-hidden sm:min-w-[120px]">
    <div className="flex items-center gap-1 whitespace-nowrap text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
      {label}
      {tooltipHtml && (
        <TooltipProvider>
          <Tooltip
            content={<span dangerouslySetInnerHTML={{ __html: tooltipHtml }} />}
          >
            <span className="cursor-help text-[10px] leading-none text-muted-foreground/60 hover:text-muted-foreground border border-muted-foreground/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center select-none">
              ?
            </span>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className="metricValue mt-2.5 text-2xl truncate sm:whitespace-nowrap">
      {value}
    </div>
    {subtitle && (
      <div className="subtitle mt-1 text-xs text-muted-foreground whitespace-nowrap">
        {subtitle}
      </div>
    )}
  </div>
)

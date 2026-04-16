import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'

type Props = {
  label: string
  value: React.ReactNode
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  'data-tooltip-html': tooltipHtml,
}) => (
  <div className="metric px-5 py-2.5 bg-card rounded-xl shadow-card border border-border-grid transition-shadow hover:shadow-hover">
    <div className="flex items-center gap-1 whitespace-nowrap text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
      {label}
      {tooltipHtml && <HelpTip html={tooltipHtml} />}
    </div>
    <div className="metricValue mt-2.5 text-2xl truncate sm:whitespace-nowrap">
      {value}
    </div>
  </div>
)

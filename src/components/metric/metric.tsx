import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { Card } from 'src/components/ui/card'

type Props = {
  label: string
  value: React.ReactNode
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  'data-tooltip-html': tooltipHtml,
}) => (
  <Card className="metric px-3 py-3 sm:px-5 sm:py-4 transition-shadow hover:shadow-hover">
    <div className="flex items-center gap-1 sm:whitespace-nowrap text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
      {label}
      {tooltipHtml && <HelpTip html={tooltipHtml} />}
    </div>
    <div className="metricValue text-xl sm:text-2xl font-semibold font-mono truncate">
      {value}
    </div>
  </Card>
)

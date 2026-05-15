import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { Card } from 'src/components/ui/card'

type Props = {
  label: string
  value: React.ReactNode
  topline?: React.ReactNode
  subline?: React.ReactNode
  extra?: React.ReactNode
  tooltipHtml?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  topline,
  subline,
  extra,
  tooltipHtml,
}) => (
  <Card className="metric px-3 py-3 sm:px-5 sm:py-4 transition-shadow hover:shadow-hover">
    <div className="flex items-center gap-1 sm:whitespace-nowrap text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
      {label}
      {tooltipHtml && <HelpTip html={tooltipHtml} />}
    </div>
    {topline && (
      <div className="text-xs text-muted-foreground font-mono mb-0.5">
        {topline}
      </div>
    )}
    <div className="metricValue text-xl sm:text-2xl font-semibold font-mono truncate">
      {value}
    </div>
    {subline && (
      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
        {subline}
      </div>
    )}
    {extra && <div className="mt-2">{extra}</div>}
  </Card>
)

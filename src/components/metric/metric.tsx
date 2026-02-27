import React from 'react'

type Props = {
  label: string
  value: string
  subtitle?: string
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  subtitle,
  ...tooltipsProps
}) => {
  return (
    <div
      className="metric px-5 py-2.5 bg-card cursor-help rounded-xl shadow-card border border-border-grid transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      {...tooltipsProps}
    >
      <div className="whitespace-nowrap text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </div>
      <div className="metricValue whitespace-nowrap mt-2.5 text-2xl">
        {value}
      </div>
      {subtitle && (
        <div className="subtitle mt-1 text-xs text-muted-foreground whitespace-nowrap">
          {subtitle}
        </div>
      )}
    </div>
  )
}

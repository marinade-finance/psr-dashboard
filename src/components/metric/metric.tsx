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
    <div className="metric px-5 py-2.5 bg-card cursor-help" {...tooltipsProps}>
      <div className="whitespace-nowrap">{label}</div>
      <div className="metricValue whitespace-nowrap mt-2.5 text-2xl">
        {value}
      </div>
      {subtitle && (
        <div className="subtitle mt-1 text-[11px] text-muted-foreground whitespace-nowrap">
          {subtitle}
        </div>
      )}
    </div>
  )
}

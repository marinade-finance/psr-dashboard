import React from 'react'

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
  ...tooltipsProps
}) => {
  return (
    <div
      className="metric px-5 py-2.5 bg-card cursor-help rounded-lg shadow-card border border-border-grid transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      {...tooltipsProps}
    >
      <div className="whitespace-nowrap text-muted-foreground">{label}</div>
      <div className="metricValue whitespace-nowrap mt-2.5 text-2xl">
        {value}
      </div>
    </div>
  )
}

import React from 'react'

type Props = {
  label: string
  value: string
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({ label, value, ...tooltipsProps }) => {
  return (
    <div
      className="px-4 py-3 bg-card border border-border rounded-lg cursor-help"
      {...tooltipsProps}
    >
      <div className="whitespace-nowrap text-2xs text-muted-foreground font-medium mb-1">
        {label}
      </div>
      <div className="whitespace-nowrap text-lg font-semibold text-foreground font-mono">
        {value}
      </div>
    </div>
  )
}

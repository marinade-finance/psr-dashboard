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
    <div className="px-5 py-2.5 bg-card mr-2.5 cursor-help" {...tooltipsProps}>
      <div className="whitespace-nowrap">{label}</div>
      <div className="whitespace-nowrap mt-2.5 text-2xl">{value}</div>
    </div>
  )
}

import React from 'react'

type Props = {
  label: string
  value: string
}

export const Metric: React.FC<Props> = ({ label, value }) => {
  return (
    <div className="px-5 py-4 bg-card border border-border rounded-xl shadow-xs">
      <div className="whitespace-nowrap text-2xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div className="whitespace-nowrap text-lg font-semibold text-foreground font-mono">
        {value}
      </div>
    </div>
  )
}

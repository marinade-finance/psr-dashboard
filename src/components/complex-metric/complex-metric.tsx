import React from 'react'

type Props = {
  label: string
  value: React.ReactNode
}

export const ComplexMetric: React.FC<Props> = ({ label, value }) => {
  return (
    <div className="font-mono text-[12px] border border-border px-4 py-3">
      <div className="text-muted-foreground text-[11px] uppercase tracking-wider">
        :: {label}
      </div>
      <div className="text-foreground font-bold text-lg">{value}</div>
    </div>
  )
}

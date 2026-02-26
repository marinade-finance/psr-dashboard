import React from 'react'

type Props = {
  label: string
  value: React.ReactNode
}

export const ComplexMetric: React.FC<Props> = ({ label, value }) => {
  return (
    <div className="px-5 py-2.5 bg-card mr-2.5">
      <div className="whitespace-nowrap">{label}</div>
      <div className="whitespace-nowrap mt-2.5 text-2xl">{value}</div>
    </div>
  )
}

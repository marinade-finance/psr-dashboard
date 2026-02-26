import React from 'react'

import { Card } from 'src/components/ui/card'

type Props = {
  label: string
  value: string
}

export const Metric: React.FC<Props> = ({ label, value }) => {
  return (
    <Card className="px-5 py-4">
      <div className="whitespace-nowrap text-2xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div className="whitespace-nowrap text-lg font-semibold text-foreground font-mono">
        {value}
      </div>
    </Card>
  )
}

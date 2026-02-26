import React from 'react'

import { Card } from 'src/components/ui/card'

export interface Props {
  title?: string
  body?: React.ReactNode
}

export const Banner: React.FC<Props> = ({ title, body }) => {
  if (!title) return null
  return (
    <Card className="mb-6 px-5 py-4 bg-info/5 border-info/20 border-l-4 border-l-info text-sm leading-relaxed text-foreground">
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-muted-foreground">{body}</div>
    </Card>
  )
}

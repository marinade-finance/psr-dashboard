import React from 'react'

export interface Props {
  title?: string
  body?: React.ReactNode
}

export const Banner: React.FC<Props> = ({ title, body }) => {
  if (!title) return null
  return (
    <div className="font-mono text-[12px] mb-4 border border-border px-4 py-3">
      <div className="font-bold text-foreground">{'>> '}{title}</div>
      <div className="text-muted-foreground mt-1">{body}</div>
    </div>
  )
}

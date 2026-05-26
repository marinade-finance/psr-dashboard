import React from 'react'

type Props = {
  title: string
  detail?: string
}

export function FetchError({ title, detail }: Props) {
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto text-center">
      <p className="text-base font-medium text-destructive">{title}</p>
      {detail && <p className="text-sm text-muted-foreground mt-2">{detail}</p>}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 text-sm text-primary hover:underline"
      >
        Reload page
      </button>
    </div>
  )
}

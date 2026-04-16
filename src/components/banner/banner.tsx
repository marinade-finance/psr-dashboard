import React, { useState } from 'react'

export type Props = {
  title: string
  body: JSX.Element
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, body }) => {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('banner') === title,
  )

  if (!title || dismissed) {
    return null
  }

  const handleDismiss = () => {
    localStorage.setItem('banner', title)
    setDismissed(true)
  }

  return (
    <div className="mb-6 relative px-5 py-4 bg-card border border-info/20 border-l-[4px] border-l-info text-sm leading-relaxed text-foreground rounded-lg shadow-card [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&_p]:my-2">
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-muted-foreground">{body}</div>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-foreground/50 hover:text-foreground bg-transparent border-none text-xl leading-none cursor-pointer"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

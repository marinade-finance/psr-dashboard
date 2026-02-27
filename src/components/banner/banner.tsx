import React, { useState } from 'react'

export type Props = {
  title: string
  body: JSX.Element
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, body: _body, ...tooltipsProps }) => {
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
    <div
      className="flex items-center justify-between bg-primary/10 border-b border-primary/20 text-sm px-4 py-2 [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline"
      {...tooltipsProps}
    >
      <span>
        <strong>{title}</strong>
      </span>
      <button
        onClick={handleDismiss}
        className="ml-4 text-foreground/60 hover:text-foreground leading-none cursor-pointer bg-transparent border-none text-base"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

import React, { useState } from 'react'

export type Props = {
  title: string
  body: JSX.Element
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, body, ...tooltipsProps }) => {
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
      className="px-2.5 pt-2.5 bg-background-page [&_a]:text-primary [&_a]:no-underline [&_a]:transition-colors [&_a:visited]:text-primary [&_a:hover]:text-primary [&_a:hover]:underline [&_a:focus]:text-primary [&_a:focus]:underline [&_a:active]:text-primary [&_p]:my-2.5"
      {...tooltipsProps}
    >
      <div className="relative p-5 bg-card text-lg leading-[1.4] border border-border rounded-xl shadow-card max-w-4xl mx-auto">
        <div className="mb-5">
          <strong>{title}</strong>
        </div>
        {body}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-foreground/50 hover:text-foreground bg-transparent border-none text-xl leading-none cursor-pointer"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}

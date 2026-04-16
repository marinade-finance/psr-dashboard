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
    <div className="px-4 pt-4 pb-0 bg-background-page [&_a]:text-primary [&_a]:no-underline [&_a]:transition-colors [&_a:visited]:text-primary [&_a:hover]:text-primary [&_a:hover]:underline [&_a:focus]:text-primary [&_a:focus]:underline [&_a:active]:text-primary [&_p]:my-2">
      <div className="relative p-5 bg-card text-sm leading-relaxed border border-border rounded-xl shadow-card">
        <div className="mb-2 font-semibold text-base">{title}</div>
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

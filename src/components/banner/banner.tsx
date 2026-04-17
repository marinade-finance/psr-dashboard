import React, { useState } from 'react'

import { Button } from 'src/components/ui/button'

export type Props = {
  title: string
  body: JSX.Element
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
    <div className="relative px-5 py-4 bg-card border border-info/20 text-sm leading-relaxed text-foreground shadow-card [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&_p]:my-2 max-w-prose mx-auto rounded-lg">
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-muted-foreground">{body}</div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-7 h-7 text-foreground/50 hover:text-foreground"
        aria-label="Dismiss"
      >
        ×
      </Button>
    </div>
  )
}

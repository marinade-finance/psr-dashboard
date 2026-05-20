import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import { Button } from 'src/components/ui/button'

export type Props = {
  title: string
  body: JSX.Element | string
}

const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'a',
  'code',
  'ul',
  'ol',
  'li',
  'br',
  'del',
]

const MARKDOWN_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
}

const urlTransform = (url: string): string => (/^https?:/i.test(url) ? url : '')

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
    <div
      role="status"
      aria-live="polite"
      className="relative px-5 py-4 bg-card border border-info/20 text-sm leading-relaxed text-foreground shadow-card [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&_p]:my-2 rounded-lg"
    >
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-muted-foreground">
        {typeof body === 'string' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            allowedElements={ALLOWED_ELEMENTS}
            components={MARKDOWN_COMPONENTS}
            urlTransform={urlTransform}
          >
            {body}
          </ReactMarkdown>
        ) : (
          body
        )}
      </div>
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

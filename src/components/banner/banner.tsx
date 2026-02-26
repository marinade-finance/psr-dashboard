import React from 'react'

export type Props = {
  title: string
  body: JSX.Element
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, body, ...tooltipsProps }) => {
  if (!title) {
    return null
  }
  return (
    <div className="px-6 py-4 bg-[var(--background-page)]" {...tooltipsProps}>
      <div className="px-5 py-4 bg-[var(--info-light)] text-sm leading-relaxed border border-[var(--info-20)] rounded-[var(--radius-lg)] border-l-4 border-l-[var(--info)] max-w-[900px] text-[var(--foreground)] [&_a]:text-[var(--info)] [&_a]:no-underline [&_a]:font-medium [&_a]:transition-colors [&_a:hover]:text-[#4f46e5] [&_a:hover]:underline [&_p]:my-2">
        <div className="mb-3 text-base font-semibold text-[var(--foreground)]">
          <strong>{title}</strong>
        </div>
        {body}
      </div>
    </div>
  )
}

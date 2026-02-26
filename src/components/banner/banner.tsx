import React from 'react'

export type Props = {
  title: string
  body: JSX.Element
}

export const Banner: React.FC<Props> = ({ title, body }) => {
  if (!title) {
    return null
  }
  return (
    <div className="px-6 py-4 bg-background-page">
      <div className="px-5 py-4 bg-info-light text-sm leading-relaxed border border-info-20 rounded-lg border-l-4 border-l-info max-w-[900px] text-foreground [&_a]:text-info [&_a]:no-underline [&_a]:font-medium [&_a]:transition-colors [&_a:hover]:text-[#4f46e5] [&_a:hover]:underline [&_p]:my-2">
        <div className="mb-3 text-base font-semibold text-foreground">
          <strong>{title}</strong>
        </div>
        {body}
      </div>
    </div>
  )
}

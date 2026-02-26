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
    <div
      className="px-2.5 pt-2.5 bg-background-page [&_a]:text-primary [&_a]:no-underline [&_a]:transition-colors [&_a:visited]:text-primary [&_a:hover]:text-primary [&_a:hover]:underline [&_a:focus]:text-primary [&_a:focus]:underline [&_a:active]:text-primary [&_p]:my-2.5"
      {...tooltipsProps}
    >
      <div className="p-5 bg-card text-lg leading-[1.4] border-[3px] border-solid border-border w-[100ex]">
        <div className="mb-5">
          <strong>{title}</strong>
        </div>
        {body}
      </div>
    </div>
  )
}

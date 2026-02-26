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
      className="px-2.5 pt-2.5 bg-[--bg-dark-2] [&_a]:text-[#61dafb] [&_a]:no-underline [&_a]:transition-colors [&_a:visited]:text-[#6090be] [&_a:hover]:text-[#21a1f1] [&_a:hover]:underline [&_a:focus]:text-[#21a1f1] [&_a:focus]:underline [&_a:active]:text-[#1b8acb] [&_p]:my-2.5"
      {...tooltipsProps}
    >
      <div className="p-5 bg-[--bg-dark-3] text-lg leading-[1.4] border-[3px] border-solid border-[--bg-dark-1] w-[100ex]">
        <div className="mb-5">
          <strong>{title}</strong>
        </div>
        {body}
      </div>
    </div>
  )
}

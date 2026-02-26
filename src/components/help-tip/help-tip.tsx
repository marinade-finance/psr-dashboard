import React, { useState } from 'react'

interface HelpTipProps {
  text: string
  children?: React.ReactNode
}

export const HelpTip = ({ text, children }: HelpTipProps) => {
  const [show, setShow] = useState(false)

  const trigger = children ? (
    <span
      className="cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
    >
      {children}
    </span>
  ) : (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-secondary text-muted-foreground text-[9px] font-bold cursor-help ml-1 select-none font-sans border-none outline-none focus:ring-2 focus:ring-ring"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label="Help"
    >
      ?
    </span>
  )

  return (
    <span className="relative inline-flex">
      {trigger}
      {show && (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[260px] px-3 py-2.5 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed font-normal font-sans z-[200] shadow-lg pointer-events-none">
          <span dangerouslySetInnerHTML={{ __html: text }} />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900" />
        </div>
      )}
    </span>
  )
}

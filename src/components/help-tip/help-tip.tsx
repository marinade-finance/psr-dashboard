import React, { useState } from 'react'

interface HelpTipProps {
  text: string
}

export const HelpTip = ({ text }: HelpTipProps) => {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex">
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)] text-[9px] font-bold cursor-help ml-1 select-none font-sans border-none outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
      {show && (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[260px] px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--foreground)] text-white text-[11px] leading-relaxed font-normal font-sans z-[200] shadow-lg pointer-events-none">
          {text}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-[var(--foreground)]" />
        </div>
      )}
    </span>
  )
}

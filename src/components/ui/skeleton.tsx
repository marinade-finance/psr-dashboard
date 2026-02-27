import React, { useEffect, useState } from 'react'

import { cn } from 'src/lib/utils'

const CHARS = '*&$#^@!%~+=<>'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 70)
    return () => clearInterval(id)
  }, [])

  const chars = Array.from(
    { length: 8 },
    (_, i) => CHARS[(frame + i * 3) % CHARS.length],
  ).join('')

  return (
    <div
      className={cn('font-mono text-border text-[11px] overflow-hidden', className)}
      {...props}
    >
      {chars}
    </div>
  )
}

export { Skeleton }

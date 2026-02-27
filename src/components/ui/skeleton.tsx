import * as React from 'react'
import { useEffect, useState } from 'react'

import { cn } from 'src/lib/utils'

const BLOCK_CHARS = ['░', '▒', '█', '▓', '░']

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setFrame(f => (f + 1) % BLOCK_CHARS.length),
      300,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn(
        'bg-muted font-mono text-border overflow-hidden',
        className,
      )}
      {...props}
    >
      <span className="opacity-60" aria-hidden="true">
        {BLOCK_CHARS[frame].repeat(20)}
      </span>
    </div>
  )
}
export { Skeleton }

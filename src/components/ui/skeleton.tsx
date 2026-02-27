import React, { useEffect, useState } from 'react'

import { cn } from 'src/lib/utils'

const CHARS = '^@&#(*@&@)!$%~+'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={cn('font-mono text-muted-foreground text-[11px]', className)}
      {...props}
    >
      {CHARS[frame % CHARS.length]}
    </div>
  )
}

export { Skeleton }

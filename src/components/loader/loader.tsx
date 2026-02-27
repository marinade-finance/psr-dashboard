import React, { useEffect, useState } from 'react'

const CHARS = '^@&#(*@&@)!$%~+'

export const Loader: React.FC = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(id)
  }, [])

  const char = CHARS[frame % CHARS.length]

  return (
    <div className="flex items-center justify-center p-12 font-mono text-foreground">
      <span className="text-2xl w-6 text-center">{char}</span>
      <span className="text-sm ml-3 tracking-[0.2em]">loading</span>
    </div>
  )
}

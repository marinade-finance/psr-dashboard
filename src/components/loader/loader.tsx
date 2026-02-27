import React, { useEffect, useState } from 'react'

const CHARS = '&#^#*!(@$%~+=<>{}[]|\\/_'

export const Loader: React.FC = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 80)
    return () => clearInterval(id)
  }, [])

  const randomChars = Array.from(
    { length: 12 },
    (_, i) => CHARS[(frame + i * 7) % CHARS.length],
  ).join('')

  return (
    <div className="flex flex-col items-center justify-center p-12 font-mono text-primary">
      <div className="text-lg tracking-widest mb-2" aria-hidden="true">
        {randomChars}
      </div>
      <div className="text-sm tracking-[0.3em]">LOADING...</div>
    </div>
  )
}

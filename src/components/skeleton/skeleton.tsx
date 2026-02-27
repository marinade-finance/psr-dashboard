import React, { useEffect, useState } from 'react'

const CHARS = '*&$#^@!%~+=<>{}[]'

const CyclingLine: React.FC<{ width?: number }> = ({ width = 40 }) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 60)
    return () => clearInterval(id)
  }, [])

  const line = Array.from(
    { length: width },
    (_, i) => CHARS[(frame + i * 3) % CHARS.length],
  ).join('')

  return (
    <div className="font-mono text-[12px] text-border leading-[1.6]">
      {line}
    </div>
  )
}

const LoadingBlock: React.FC<{ lines?: number }> = ({ lines = 8 }) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 80)
    return () => clearInterval(id)
  }, [])

  const chars = Array.from(
    { length: 16 },
    (_, i) => CHARS[(frame + i * 5) % CHARS.length],
  ).join('')

  return (
    <div className="font-mono text-[12px] leading-[1.8] text-foreground py-8">
      <div className="text-muted-foreground mb-2">
        :: LOADING...
      </div>
      <div className="text-border tracking-widest mb-4">{chars}</div>
      {Array.from({ length: lines }, (_, i) => (
        <CyclingLine key={i} width={50 + (i % 4) * 15} />
      ))}
    </div>
  )
}

export const SamSkeleton: React.FC = () => <LoadingBlock lines={12} />
export const BondsSkeleton: React.FC = () => <LoadingBlock lines={10} />
export const EventsSkeleton: React.FC = () => <LoadingBlock lines={10} />

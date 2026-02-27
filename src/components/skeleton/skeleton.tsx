import React from 'react'

const TerminalLoadingLine: React.FC<{ width?: number }> = ({
  width = 60,
}) => {
  const chars = '░'.repeat(width)
  return (
    <div className="font-mono text-[12px] text-border animate-pulse">
      {chars}
    </div>
  )
}

export const SamSkeleton: React.FC = () => (
  <div className="font-mono text-[12px] space-y-1">
    <TerminalLoadingLine width={80} />
    <TerminalLoadingLine width={120} />
    <div className="text-muted-foreground my-2">
      {'─'.repeat(120)}
    </div>
    {Array.from({ length: 12 }, (_, i) => (
      <TerminalLoadingLine key={i} width={100 + (i % 3) * 10} />
    ))}
  </div>
)

export const BondsSkeleton: React.FC = () => (
  <div className="font-mono text-[12px] space-y-1">
    <TerminalLoadingLine width={80} />
    <div className="text-muted-foreground my-2">
      {'─'.repeat(100)}
    </div>
    {Array.from({ length: 12 }, (_, i) => (
      <TerminalLoadingLine key={i} width={90 + (i % 4) * 8} />
    ))}
  </div>
)

export const EventsSkeleton: React.FC = () => (
  <div className="font-mono text-[12px] space-y-1">
    <TerminalLoadingLine width={80} />
    <div className="text-muted-foreground my-2">
      {'─'.repeat(100)}
    </div>
    {Array.from({ length: 12 }, (_, i) => (
      <TerminalLoadingLine key={i} width={85 + (i % 5) * 7} />
    ))}
  </div>
)

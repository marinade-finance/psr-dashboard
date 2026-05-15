import React from 'react'
import { Link } from 'react-router-dom'

import { cn } from 'src/class_utils'

const STATUS_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-destructive-light text-destructive',
  yellow: 'bg-status-yellow-light text-status-yellow',
  green: 'bg-primary-light text-primary',
}

// Internal header for CalcCard — title + optional Guide link, with a
// "Simulated · " prefix when the card is showing what-if numbers.
// Uniformity lives at the card level (every detail-panel card uses
// CalcCard), so this helper has no callers outside this file.
const CardHeader: React.FC<{
  title: string
  guideTo?: string
  isSimulated?: boolean
  onTitleClick?: () => void
  className?: string
}> = ({ title, guideTo, isSimulated, onTitleClick, className }) => (
  <h3
    className={cn(
      'text-base font-semibold text-foreground flex items-center gap-2',
      className,
    )}
  >
    {isSimulated && <span className="text-status-yellow">Simulated ·</span>}
    {onTitleClick ? (
      <button
        type="button"
        onClick={onTitleClick}
        className="hover:underline hover:text-primary transition-colors cursor-pointer"
      >
        {title}
      </button>
    ) : (
      title
    )}
    {guideTo && (
      <Link
        to={guideTo}
        className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors"
      >
        Guide →
      </Link>
    )}
  </h3>
)

export const CalcCard: React.FC<{
  title: string
  guideTo?: string
  isSimulated?: boolean
  onTitleClick?: () => void
  status?: { label: string; tone: 'red' | 'yellow' | 'green' }
  tip?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, onTitleClick, status, tip, children }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <CardHeader
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      onTitleClick={onTitleClick}
      className="mb-3"
    />
    {status && (
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm mb-4',
          STATUS_CLASSES[status.tone],
        )}
      >
        {status.label}
      </div>
    )}
    {children}
    {tip && <div className="mt-4 pt-3 border-t border-border">{tip}</div>}
  </div>
)

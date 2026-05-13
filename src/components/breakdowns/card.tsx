import React from 'react'
import { Link } from 'react-router-dom'

const STATUS_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-destructive-light text-destructive',
  yellow: 'bg-status-yellow-light text-status-yellow',
  green: 'bg-primary-light text-primary',
}

export const CalcCard: React.FC<{
  title: string
  guideTo?: string
  isSimulated?: boolean
  status?: { label: string; tone: 'red' | 'yellow' | 'green' }
  tip?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, status, tip, children }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
      {isSimulated && <span className="text-status-yellow">Simulated ·</span>}
      {title}
      {guideTo && (
        <Link
          to={guideTo}
          className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors"
        >
          Guide →
        </Link>
      )}
    </h3>
    {status && (
      <div
        className={`rounded-lg px-3 py-2 text-sm mb-4 ${STATUS_CLASSES[status.tone]}`}
      >
        {status.label}
      </div>
    )}
    {children}
    {tip && <div className="mt-4 pt-3 border-t border-border">{tip}</div>}
  </div>
)

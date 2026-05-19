import React from 'react'

import { cn } from 'src/class_utils'

export type CardStatusTone = 'red' | 'yellow' | 'green' | 'grey'
export type CardStatus = {
  label: string
  tone: CardStatusTone
  // Optional jump affordance rendered as a pill on the right side of the
  // status banner — same visual as the validator-detail header banner's
  // "Bond tab →" pill. Provide both label and onClick to render.
  action?: { label: string; onClick: () => void }
}

const STATUS_CLASSES: Record<CardStatusTone, string> = {
  red: 'bg-destructive-light text-destructive',
  yellow: 'bg-status-yellow-light text-status-yellow',
  green: 'bg-primary-light text-primary',
  grey: 'bg-muted text-muted-foreground',
}

// Shared button shape for the "Simulate ... →" tip at the bottom of each
// breakdown card. Identical across bid-penalty / bidding / bond-coverage /
// payments — kept here so the four breakdowns stay byte-aligned.
export const SIM_JUMP_BUTTON_CLASS =
  'text-xs font-medium px-2 py-0.5 rounded border border-primary text-primary hover:bg-primary-light'

// Pill border/text per tone — paired with bg-card/55 fill for the action
// affordance on the right of a status banner. Same recipe as the
// validator-detail header banner's "Bond tab →" pill: bg-card/55 + tone-
// coloured border and text — keeps both surfaces in lockstep.
const STATUS_ACTION_CLASSES: Record<CardStatusTone, string> = {
  red: 'border-destructive text-destructive',
  yellow: 'border-status-yellow text-status-yellow',
  green: 'border-primary text-primary',
  grey: 'border-muted-foreground text-muted-foreground',
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
      <a
        href={guideTo}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors"
      >
        Guide ↗
      </a>
    )}
  </h3>
)

export const CalcCard: React.FC<{
  title: string
  guideTo?: string
  isSimulated?: boolean
  onTitleClick?: () => void
  status?: CardStatus
  tip?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, onTitleClick, status, tip, children }) => (
  <div className="bg-card rounded-xl border border-border p-4">
    <CardHeader
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      onTitleClick={onTitleClick}
      className="mb-3"
    />
    {status && (
      <div className="mb-4">
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm flex items-center gap-3',
            STATUS_CLASSES[status.tone],
            status.action && 'cursor-pointer select-none',
          )}
          onClick={status.action?.onClick}
        >
          <span className="flex-1">{status.label}</span>
          {status.action && (
            <span
              className={cn(
                'text-xs font-medium shrink-0 px-2 py-0.5 rounded border whitespace-nowrap bg-card/55',
                STATUS_ACTION_CLASSES[status.tone],
              )}
            >
              {status.action.label}
            </span>
          )}
        </div>
        {tip && <div className="mt-2 px-3 text-left">{tip}</div>}
      </div>
    )}
    {children}
    {!status && tip && (
      <div className="mt-4 pt-3 border-t border-border">{tip}</div>
    )}
  </div>
)

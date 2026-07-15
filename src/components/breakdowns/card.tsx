import React from 'react'

import { cn } from 'src/class_utils'
import type { BondHealthState } from 'src/services/bond-health'
import { type TipUrgency, type ValidatorTip } from 'src/services/tip-engine'
import { assertNever } from 'src/utils/assert-never'

import {
  severityActionClass,
  severityBannerClass,
} from 'src/components/breakdowns/severity-style'

import type { CardStatus, CardStatusSeverity } from 'src/services/card-status'

export type { CardStatus, CardStatusSeverity }

const urgencyToSeverity = (urgency: TipUrgency): CardStatusSeverity => {
  switch (urgency) {
    case 'critical':
      return 'critical'
    case 'warning':
    case 'info':
      return 'warning'
    case 'positive':
      return 'good'
    case 'neutral':
      return 'neutral'
    default:
      return assertNever(urgency)
  }
}

const bondHealthToSeverity = (health: BondHealthState): CardStatusSeverity => {
  switch (health) {
    case 'no-bond':
    case 'critical':
      return 'critical'
    case 'watch':
      return 'warning'
    case 'healthy':
      return 'good'
    default:
      return assertNever(health)
  }
}

// Bond tips take severity off bond-health; other tips off urgency. Bond +
// NEUTRAL is the "below-min, no fee" exception — stays urgency-driven so it
// can read neutral instead of inheriting health critical.
export const tipBannerSeverity = (
  tip: ValidatorTip,
  bondHealth: BondHealthState,
): CardStatusSeverity => {
  if (tip.constraint === 'bond' && tip.urgency !== 'neutral') {
    return bondHealthToSeverity(bondHealth)
  }
  return urgencyToSeverity(tip.urgency)
}

// Shared status banner — rounded pill with status text on the left and an
// optional action pill on the right. Used by CalcCard's status slot AND by
// the validator-detail header tip banner so they stay byte-aligned.
export function withSimAction(
  base: Omit<CardStatus, 'action'>,
  onGoToSim?: () => void,
): CardStatus {
  return onGoToSim
    ? {
        ...base,
        action: {
          label: 'Simulate →',
          severity: 'warning',
          onClick: onGoToSim,
        },
      }
    : base
}

export const StatusBanner: React.FC<{
  status: CardStatus
  className?: string
}> = ({ status, className }) => {
  const actionSeverity = status.action?.severity ?? status.severity
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-sm flex items-center gap-3',
        severityBannerClass(status.severity),
        status.action && 'cursor-pointer select-none',
        className,
      )}
      onClick={status.action?.onClick}
    >
      <span className="flex-1">{status.label}</span>
      {status.action && (
        <span
          className={cn(
            'text-xs font-medium shrink-0 px-2 py-0.5 rounded border whitespace-nowrap bg-card/55',
            severityActionClass(actionSeverity),
          )}
        >
          {status.action.label}
        </span>
      )}
    </div>
  )
}

// Internal header for CalcCard — title + optional Guide link, with a
// "Simulated · " prefix when the card is showing what-if numbers.
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
        <StatusBanner status={status} />
        {tip && <div className="mt-2 px-3 text-left">{tip}</div>}
      </div>
    )}
    {children}
  </div>
)

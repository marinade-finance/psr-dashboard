import React from 'react'

import { cn } from 'src/class_utils'
import { BondHealthState } from 'src/services/bond-health'
import { CardStatusTone } from 'src/services/card-status'
import { type TipUrgency, type ValidatorTip } from 'src/services/tip-engine'
import { assertNever } from 'src/utils/assert-never'

import type { CardStatus, CardStatusAction } from 'src/services/card-status'

export { CardStatusTone }
export type { CardStatus, CardStatusAction }

const STATUS_CLASSES: Record<CardStatusTone, string> = {
  [CardStatusTone.RED]: 'bg-destructive-light text-destructive',
  [CardStatusTone.YELLOW]: 'bg-status-yellow-light text-status-yellow',
  [CardStatusTone.GREEN]: 'bg-primary-light text-primary',
  [CardStatusTone.GREY]: 'bg-muted text-muted-foreground',
}

// Pill border/text per tone — paired with bg-card/55 fill for the action
// affordance on the right of a status banner. Same recipe as the
// validator-detail header banner's "Bond tab →" pill: bg-card/55 + tone-
// coloured border and text — keeps both surfaces in lockstep.
const STATUS_ACTION_CLASSES: Record<CardStatusTone, string> = {
  [CardStatusTone.RED]: 'border-destructive text-destructive',
  [CardStatusTone.YELLOW]: 'border-status-yellow text-status-yellow',
  [CardStatusTone.GREEN]: 'border-primary text-primary',
  [CardStatusTone.GREY]: 'border-muted-foreground text-muted-foreground',
}

const urgencyToTone = (urgency: TipUrgency): CardStatusTone => {
  switch (urgency) {
    case 'critical':
      return CardStatusTone.RED
    case 'warning':
    case 'info':
      return CardStatusTone.YELLOW
    case 'positive':
      return CardStatusTone.GREEN
    case 'neutral':
      return CardStatusTone.GREY
    default:
      return assertNever(urgency)
  }
}

const bondHealthToTone = (health: BondHealthState): CardStatusTone => {
  switch (health) {
    case BondHealthState.NO_BOND:
    case BondHealthState.CRITICAL:
      return CardStatusTone.RED
    case BondHealthState.WATCH:
      return CardStatusTone.YELLOW
    case BondHealthState.HEALTHY:
      return CardStatusTone.GREEN
    default:
      return assertNever(health)
  }
}

// Bond tips colour off bond-health (red/yellow/green axis); other tips
// colour off urgency. Bond + NEUTRAL is the "below-min, no fee" exception —
// stays urgency-driven so it can read grey instead of inheriting health red.
export const tipBannerTone = (
  tip: ValidatorTip,
  bondHealth: BondHealthState,
): CardStatusTone => {
  if (
    tip.constraint === 'bond' &&
    tip.urgency !== 'neutral'
  ) {
    return bondHealthToTone(bondHealth)
  }
  return urgencyToTone(tip.urgency)
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
          tone: CardStatusTone.YELLOW,
          onClick: onGoToSim,
        },
      }
    : base
}

export const StatusBanner: React.FC<{
  status: CardStatus
  className?: string
}> = ({ status, className }) => {
  const actionTone = status.action?.tone ?? status.tone
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-sm flex items-center gap-3',
        STATUS_CLASSES[status.tone],
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
            STATUS_ACTION_CLASSES[actionTone],
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
        <StatusBanner status={status} />
        {tip && <div className="mt-2 px-3 text-left">{tip}</div>}
      </div>
    )}
    {children}
    {!status && tip && (
      <div className="mt-4 pt-3 border-t border-border">{tip}</div>
    )}
  </div>
)

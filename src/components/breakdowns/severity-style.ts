import type { CardStatusSeverity } from 'src/services/card-status'

// SINGLE source mapping a calc-layer CardStatusSeverity to Tailwind classes.
// Every surface that renders a severity — status banner, action pill, row
// marker, row value text — resolves its classes here, so the severity→colour
// mapping lives in exactly one place.

const BANNER: Record<CardStatusSeverity, string> = {
  critical: 'bg-destructive-light text-destructive',
  warning: 'bg-status-yellow-light text-status-yellow',
  good: 'bg-primary-light text-primary',
  neutral: 'bg-muted text-muted-foreground',
}

const ACTION: Record<CardStatusSeverity, string> = {
  critical: 'border-destructive text-destructive',
  warning: 'border-status-yellow text-status-yellow',
  good: 'border-primary text-primary',
  neutral: 'border-muted-foreground text-muted-foreground',
}

const MARKER: Record<CardStatusSeverity, string> = {
  critical: 'bg-destructive',
  warning: 'bg-status-yellow',
  good: 'bg-primary',
  neutral: 'bg-muted-foreground',
}

const TEXT: Record<CardStatusSeverity, string> = {
  critical: 'text-destructive',
  warning: 'text-status-yellow',
  good: 'text-status-green',
  neutral: 'text-muted-foreground',
}

export const severityBannerClass = (s: CardStatusSeverity) => BANNER[s]
export const severityActionClass = (s: CardStatusSeverity) => ACTION[s]
export const severityMarkerClass = (s: CardStatusSeverity) => MARKER[s]
export const severityTextClass = (s: CardStatusSeverity) => TEXT[s]

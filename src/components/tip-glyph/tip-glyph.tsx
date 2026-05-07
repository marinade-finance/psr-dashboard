import React from 'react'

import type { TipUrgency } from 'src/services/tip-engine'

const ICON_CLASS: Record<TipUrgency, string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
  positive: 'text-primary',
  neutral: 'text-muted-foreground',
}

// All glyphs share viewBox 0 0 12 12, currentColor stroke 1.6, round linecaps
// — keeps strokes/baselines consistent across urgencies, unlike unicode glyphs
// (⚠ ↗ 💡 ✓ →) which render at different weights.
const PATHS: Record<TipUrgency, React.ReactNode> = {
  critical: (
    <>
      <path d="M6 1.5L11 10.5H1L6 1.5Z" strokeLinejoin="round" />
      <line x1="6" y1="5" x2="6" y2="7.5" />
      <circle cx="6" cy="9" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  warning: <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" />,
  info: (
    <>
      <circle cx="6" cy="6" r="4.8" />
      <line x1="6" y1="5.5" x2="6" y2="8.5" />
      <circle cx="6" cy="3.5" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  positive: <path d="M2.5 6.5L5 9L9.5 3.5" />,
  neutral: <path d="M2.5 6H9.5M9.5 6L7 3.5M9.5 6L7 8.5" />,
}

type Props = {
  urgency: TipUrgency
  className?: string
}

export const TipGlyph: React.FC<Props> = ({ urgency, className = '' }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden="true"
    className={`shrink-0 ${ICON_CLASS[urgency]} ${className}`}
  >
    {PATHS[urgency]}
  </svg>
)

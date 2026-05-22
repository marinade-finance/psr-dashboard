// Tone enum and CardStatus shapes are pure-data — they belong in the service
// layer so tip-engine and other services can build CardStatus values without
// importing from `src/components/` (which would create a circular import).
// The component layer maps the enum to CSS classes; the data layer doesn't
// know or care.

export const CardStatusTone = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  GREY: 'grey',
} as const
export type CardStatusTone = (typeof CardStatusTone)[keyof typeof CardStatusTone]

export type CardStatusAction = {
  label: string
  onClick: () => void
  // Pill colour. Defaults to the banner's own tone (e.g. red status with a
  // red "Bond tab →" pill). Override to 'yellow' for sim-jump pills so the
  // simulation affordance reads consistently across tones.
  tone?: CardStatusTone
}

export type CardStatus = {
  label: string
  tone: CardStatusTone
  action?: CardStatusAction
}

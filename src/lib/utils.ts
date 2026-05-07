import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { UserLevel } from 'src/components/navigation/navigation'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function docsPath(level?: UserLevel): string {
  return level === UserLevel.Expert ? '/expert-docs' : '/docs'
}

// CSS variable references for inline styles. Use a Tailwind class
// (text-primary, bg-warning, etc.) whenever possible — these are only
// for the rare case where the color is chosen at runtime from JS state.
export const CSS_PRIMARY = 'var(--primary)'
export const CSS_DESTRUCTIVE = 'var(--destructive)'
export const CSS_PRIMARY_LIGHT = 'var(--primary-light)'
export const CSS_DESTRUCTIVE_LIGHT = 'var(--destructive-light)'
export const CSS_STATUS_GREEN = 'var(--status-green)'
export const CSS_STATUS_YELLOW = 'var(--status-yellow)'
export const CSS_STATUS_YELLOW_LIGHT = 'var(--status-yellow-light)'
export const CSS_WARNING = 'var(--warning)'
export const CSS_MUTED_FG = 'var(--muted-foreground)'

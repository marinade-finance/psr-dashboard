import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CSS_PRIMARY: string = 'var(--primary)'
export const CSS_DESTRUCTIVE: string = 'var(--destructive)'
export const CSS_PRIMARY_LIGHT: string = 'var(--primary-light)'
export const CSS_DESTRUCTIVE_LIGHT: string = 'var(--destructive-light)'
export const CSS_STATUS_GREEN: string = 'var(--status-green, #2aa198)'

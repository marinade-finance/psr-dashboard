import React, { useEffect } from 'react'

import { cn } from 'src/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        style={{ animation: 'sheet-fade-in 150ms ease' }}
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  )
}

interface SheetContentProps {
  side?: 'right' | 'left' | 'top' | 'bottom'
  className?: string
  children: React.ReactNode
}

export function SheetContent({
  side = 'right',
  className,
  children,
}: SheetContentProps) {
  const base = 'fixed z-50 bg-background shadow-xl overflow-y-auto'
  const sideClass =
    side === 'right'
      ? 'inset-y-0 right-0 h-full border-l border-border'
      : side === 'left'
        ? 'inset-y-0 left-0 h-full border-r border-border'
        : side === 'top'
          ? 'inset-x-0 top-0 border-b border-border'
          : 'inset-x-0 bottom-0 border-t border-border'

  const animationStyle =
    side === 'right'
      ? { animation: 'sheet-slide-in-right 300ms ease' }
      : side === 'left'
        ? { animation: 'sheet-slide-in-right 300ms ease reverse' }
        : {}

  return (
    <div className={cn(base, sideClass, className)} style={animationStyle}>
      {children}
    </div>
  )
}

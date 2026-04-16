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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
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
  const base =
    'relative z-50 bg-background shadow-xl overflow-y-auto flex-shrink-0'
  const sideClass =
    side === 'right'
      ? 'ml-auto h-full'
      : side === 'left'
        ? 'mr-auto h-full'
        : side === 'top'
          ? 'w-full mt-auto'
          : 'w-full mb-auto'
  return <div className={cn(base, sideClass, className)}>{children}</div>
}

import * as DialogPrimitive from '@radix-ui/react-dialog'
import React from 'react'

import { cn } from 'src/class_utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  )
}

interface SheetContentProps {
  side?: 'right' | 'left' | 'top' | 'bottom'
  className?: string
  title?: string
  children: React.ReactNode
}

const SR_ONLY =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0'

export function SheetContent({
  side = 'right',
  className,
  title = 'Detail',
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
        : undefined

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/50"
        style={{ animation: 'sheet-fade-in 150ms ease' }}
      />
      <DialogPrimitive.Content
        className={cn(base, sideClass, className)}
        style={animationStyle}
      >
        <DialogPrimitive.Title className={SR_ONLY}>
          {title}
        </DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

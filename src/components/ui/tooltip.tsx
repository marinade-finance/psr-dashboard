import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import React from 'react'

import { cn } from 'src/class_utils'

const TooltipProvider = TooltipPrimitive.Provider

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        // `select-text cursor-text` lets users drag-select the tip body.
        // Default Radix tooltips inherit `user-select:none` from the trigger.
        // The pinned-tooltip wiring in HelpTip keeps the content open while
        // the selection is in progress (mousedown inside [role=tooltip] is
        // explicitly exempted from outside-click dismiss).
        className={cn(
          'z-50 max-w-[400px] overflow-hidden rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md select-text cursor-text animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

type TooltipProps = {
  content: React.ReactNode
  children: React.ReactNode
  delayDuration?: number
  // Optional controlled open. Omit both for the default hover behaviour.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tooltip({
  content,
  children,
  delayDuration = 300,
  open,
  onOpenChange,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
      open={open}
      onOpenChange={onOpenChange}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent>{content}</TooltipContent>
    </TooltipPrimitive.Root>
  )
}

// Tooltip with HTML-string content. Forwards the trigger via Radix asChild —
// the caller's element receives ref/event handlers directly, so layout (table
// cells, flex tiles) stays intact. Pass exactly one element child.
type HtmlTooltipProps = {
  html: string
  children: React.ReactElement
}

function HtmlTooltip({ html, children }: HtmlTooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent className="max-w-[min(640px,calc(100vw-24px))] bg-black/90 text-white/95">
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </TooltipContent>
    </TooltipPrimitive.Root>
  )
}

export { TooltipProvider, Tooltip, HtmlTooltip }

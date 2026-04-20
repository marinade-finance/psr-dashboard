import React from 'react'

import { cn } from 'src/lib/utils'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-[11px] uppercase tracking-wider font-medium text-muted-foreground',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

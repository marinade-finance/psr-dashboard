import React from 'react'

import { cn } from 'src/class_utils'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-xs uppercase tracking-wider font-medium text-muted-foreground',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

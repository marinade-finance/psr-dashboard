import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from 'src/lib/utils'

import type { VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        destructive: 'bg-destructive text-white',
        estimate: 'bg-primary-light text-primary',
        dryrun: 'bg-muted text-muted-foreground',
        healthy: 'bg-primary-light-10 text-primary',
        watch: 'bg-warning-light text-warning',
        critical: 'bg-destructive-light text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

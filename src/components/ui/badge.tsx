import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from 'src/lib/utils'

import type { VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center px-1.5 py-0.5 text-xs font-medium font-mono border',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-primary',
        secondary: 'bg-secondary text-secondary-foreground border-border',
        outline: 'border-border text-foreground',
        destructive: 'bg-destructive text-white border-destructive',
        estimate: 'bg-primary-light text-primary border-primary/30',
        dryrun: 'bg-muted text-muted-foreground border-border',
        healthy: 'bg-primary-light-10 text-primary border-primary/20',
        watch: 'bg-warning-light text-warning border-warning/30',
        critical: 'bg-destructive-light text-destructive border-destructive/30',
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

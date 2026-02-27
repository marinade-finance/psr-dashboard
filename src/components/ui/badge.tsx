import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from 'src/lib/utils'

import type { VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center px-1.5 py-0.5 text-xs font-medium font-mono border border-border text-foreground bg-transparent',
  {
    variants: {
      variant: {
        default: '',
        secondary: '',
        outline: '',
        destructive: '',
        estimate: 'text-primary border-primary',
        dryrun: 'text-muted-foreground',
        healthy: '',
        watch: '',
        critical: '',
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

import * as React from 'react'

import { cn } from 'src/lib/utils'

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      'w-full border-collapse border-spacing-0 font-mono',
      className,
    )}
    {...props}
  />
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'sticky top-0 text-muted-foreground cursor-pointer select-none z-[1]',
      className,
    )}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      '[&:last-child_td]:border-b-0',
      className,
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'relative px-4 py-3 whitespace-nowrap text-2xs font-semibold uppercase tracking-wider border-b-2 border-border font-mono',
      className,
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'relative px-4 py-2.5 whitespace-nowrap text-sm border-b border-border-grid font-mono',
      className,
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export {
  Table as ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
}

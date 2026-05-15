import React from 'react'

import { cn } from 'src/class_utils'

export const SEPARATOR_DIV_CLASS = 'border-t border-border-grid pt-2 mt-1'
// Cell padding for table rows above/below the separator border. The extra
// top space is what makes the total row breathe — a thin border alone reads
// as "more rows below" without it.
export const SEPARATOR_CELL_PAD = 'pt-3 pb-1.5'
// Total rows get a bit more room above the divider to read as a conclusion.
export const TOTAL_CELL_PAD = 'pt-4 pb-2'
export const NORMAL_CELL_PAD = 'py-1.5'

export const SectionHeader: React.FC<{ title: string; colSpan?: number }> = ({
  title,
  colSpan = 3,
}) => (
  <tr>
    <td
      colSpan={colSpan}
      className="pt-4 pb-1 text-xs uppercase tracking-wider text-muted-foreground border-b border-dashed border-border"
    >
      {title}
    </td>
  </tr>
)

const MARKER_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-destructive',
  yellow: 'bg-status-yellow',
  green: 'bg-primary',
}

export const Marker: React.FC<{ tone: 'red' | 'yellow' | 'green' }> = ({
  tone,
}) => (
  <span
    className={cn(
      'inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle',
      MARKER_CLASSES[tone],
    )}
  />
)

export type Severity = 'ok' | 'warning' | 'error'

const SEVERITY_TONE: Record<Severity, 'green' | 'yellow' | 'red'> = {
  ok: 'green',
  warning: 'yellow',
  error: 'red',
}

export const CalcRow: React.FC<{
  label: string
  secondary?: string
  value?: string
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
  severity?: Severity
}> = ({
  label,
  secondary,
  value = '',
  bold,
  large,
  separator,
  total,
  severity,
}) => {
  const tone = severity ? SEVERITY_TONE[severity] : undefined
  const sep = total || separator
  const bld = total || bold
  const lg = total || large
  // The total/separator divider used to live only on the value <td>, which
  // rendered as a half-width line. Apply the border + padding to all three
  // cells so it spans the full row width, and tint the row so the section
  // conclusion is visually anchored.
  const cellPad = total
    ? TOTAL_CELL_PAD
    : sep
      ? SEPARATOR_CELL_PAD
      : NORMAL_CELL_PAD
  const sepBorder = total
    ? 'border-t border-muted-foreground/30'
    : sep && 'border-t-2 border-border'
  const labelColor = total ? 'text-foreground' : 'text-muted-foreground'
  return (
    <tr className="border-b border-border-grid/65 last:border-b-0">
      <td
        className={cn(
          'pr-2',
          lg ? 'text-base' : 'text-xs',
          cellPad,
          bld && 'font-semibold',
          labelColor,
          sepBorder,
        )}
      >
        {tone && !total && <Marker tone={tone} />}
        {label}
      </td>
      <td
        className={cn(
          'px-2 text-right font-mono text-xs text-muted-foreground',
          cellPad,
          sepBorder,
        )}
      >
        {secondary ?? ''}
      </td>
      <td
        className={cn(
          'pl-2 text-right font-mono',
          cellPad,
          lg ? 'text-base' : 'text-xs',
          bld && 'font-semibold',
          total ? 'tabular-nums text-foreground' : 'text-muted-foreground',
          sepBorder,
          tone === 'red' && 'text-destructive',
          tone === 'yellow' && 'text-status-yellow',
          tone === 'green' && 'text-status-green',
        )}
      >
        {value}
      </td>
    </tr>
  )
}

export const OkRow: React.FC<{ message: string }> = ({ message }) => (
  <tr>
    <td colSpan={2} className="py-1.5 pr-2 text-xs text-muted-foreground">
      {message}
    </td>
    <td className="py-1.5 pl-2 text-right font-mono text-xs text-status-green">
      ●
    </td>
  </tr>
)

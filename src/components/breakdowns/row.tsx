import React from 'react'

import { cn } from 'src/class_utils'
import { HelpTip } from 'src/components/help-tip/help-tip'

export const SEPARATOR_DIV_CLASS = 'border-t border-border-grid pt-2 mt-1'
// Cell padding for table rows above/below the separator border. The extra
// top space is what makes the total row breathe — a thin border alone reads
// as "more rows below" without it.
export const SEPARATOR_CELL_PAD = 'pt-3 pb-1.5'
// Total rows: slightly tighter top than before so the following
// SectionHeader breaks cleanly from the conclusion.
export const TOTAL_CELL_PAD = 'pt-3 pb-2'
export const NORMAL_CELL_PAD = 'py-1.5'

// `unit` puts a shared column unit (e.g. "PMPE" or "epochs") in the section
// header instead of repeating it on every row label. SOL and % are NEVER
// declared here — SOL gets an inline suffix on the value, % is annotated
// beside the value. `unit` aligns over col2; `col1Unit` aligns over col1
// for sections where the two columns carry different kinds (e.g. payments:
// col1 = PMPE rate, col2 = SOL cost).
export const SectionHeader: React.FC<{
  title: string
  colSpan?: number
  help?: string
  unit?: string
  col1Unit?: string
}> = ({ title, colSpan = 3, help, unit, col1Unit }) => {
  const headerCellCls =
    'pt-6 pb-1 text-xs uppercase tracking-wider text-muted-foreground border-t border-dashed border-border [tr:first-child>&]:border-t-0 [tr:first-child>&]:pt-0'
  if (col1Unit) {
    return (
      <tr>
        <td className={cn(headerCellCls, 'pr-2')}>
          {help ? <HelpTip text={help}>{title}</HelpTip> : <span>{title}</span>}
        </td>
        <td className={cn(headerCellCls, 'px-2 text-right font-mono')}>
          {col1Unit}
        </td>
        <td className={cn(headerCellCls, 'pl-2 text-right font-mono')}>
          {unit ?? ''}
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <td colSpan={colSpan} className={headerCellCls}>
        <div className="flex items-center justify-between">
          {help ? <HelpTip text={help}>{title}</HelpTip> : <span>{title}</span>}
          {unit && <span className="font-mono normal-case">{unit}</span>}
        </div>
      </td>
    </tr>
  )
}

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

const TEXT_BASE = 'text-base'
const TEXT_XS = 'text-xs'
const BOLD = 'font-semibold'
const MUTED = 'text-muted-foreground'
const MID_CELL = 'px-2 text-right font-mono text-xs text-muted-foreground'
const TONE_TEXT: Record<'green' | 'yellow' | 'red', string> = {
  green: 'text-status-green',
  yellow: 'text-status-yellow',
  red: 'text-destructive',
}

// Single shared per-row visual model. CalcRow renders `Label | col1 | col2`
// for every breakdown table. Padding/divider/weight derive from these flags:
//
//   - Plain row: raw input / step. No flags.
//   - Sub-total / calculated intermediate: pass `severity` only — the dot
//     carries the signal. Never combine with `bold`; bold is reserved for
//     section conclusions / totals.
//   - Section conclusion: `separator + bold + large`.
//   - Total: `total` (implies separator + bold + large + divider above).
//
// Each column NEVER mixes value kinds. PMPE / epochs / named non-SOL non-%
// units are declared once in the SectionHeader; SOL appears as an inline
// suffix on the value; % appears as an inline annotation on the value.
function rowStyle(opts: {
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
}) {
  const sep = opts.total || opts.separator
  const bld = opts.total || opts.bold
  const lg = opts.total || opts.large
  const cellPad = opts.total
    ? TOTAL_CELL_PAD
    : sep
      ? SEPARATOR_CELL_PAD
      : NORMAL_CELL_PAD
  const sepBorder = opts.total
    ? 'border-t border-muted-foreground/30'
    : sep && 'border-t-2 border-border'
  return { sep, bld, lg, cellPad, sepBorder, total: opts.total }
}

export const CalcRow: React.FC<{
  label: string
  help?: string
  col1?: string
  col2?: string
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
  severity?: Severity
}> = ({ label, help, col1, col2, bold, large, separator, total, severity }) => {
  const tone = severity ? SEVERITY_TONE[severity] : undefined
  const { bld, lg, cellPad, sepBorder } = rowStyle({
    bold,
    large,
    separator,
    total,
  })
  return (
    <tr className="border-b border-border-grid/65 last:border-b-0">
      <td
        className={cn(
          'pr-2',
          lg ? TEXT_BASE : TEXT_XS,
          cellPad,
          bld && BOLD,
          total ? 'text-foreground' : MUTED,
          sepBorder,
        )}
      >
        {tone && !total && <Marker tone={tone} />}
        {help ? <HelpTip text={help}>{label}</HelpTip> : <span>{label}</span>}
      </td>
      <td className={cn(MID_CELL, cellPad, sepBorder)}>{col1 ?? ''}</td>
      <td
        className={cn(
          'pl-2 text-right font-mono',
          cellPad,
          lg ? TEXT_BASE : TEXT_XS,
          bld && BOLD,
          total ? 'tabular-nums text-foreground' : MUTED,
          sepBorder,
          tone && TONE_TEXT[tone],
        )}
      >
        {col2 ?? ''}
      </td>
    </tr>
  )
}

export const OkRow: React.FC<{ message: string; colSpan?: number }> = ({
  message,
  colSpan = 2,
}) => (
  <tr>
    <td colSpan={colSpan} className="py-1.5 pr-2 text-xs text-muted-foreground">
      {message}
    </td>
    <td className="py-1.5 pl-2 text-right font-mono text-xs text-status-green">
      ●
    </td>
  </tr>
)

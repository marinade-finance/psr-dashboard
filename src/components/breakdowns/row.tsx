import React from 'react'

import { cn } from 'src/class_utils'
import { HelpTip } from 'src/components/help-tip/help-tip'

export const SEPARATOR_DIV_CLASS = 'border-t border-border-grid pt-2 mt-1'
// Cell padding for table rows above/below the separator border. The extra
// top space is what makes the total row breathe — a thin border alone reads
// as "more rows below" without it.
export const SEPARATOR_CELL_PAD = 'pt-3 pb-1.5'
// Total rows get a bit more room above the divider to read as a conclusion.
export const TOTAL_CELL_PAD = 'pt-4 pb-2'
export const NORMAL_CELL_PAD = 'py-1.5'

// `unit` puts a shared column unit (e.g. "PMPE" or "SOL") in the section
// header instead of repeating it on every row label below. It right-aligns
// over the value column so the rows read as "<label> … <number>" with the
// unit stated once.
export const SectionHeader: React.FC<{
  title: string
  colSpan?: number
  help?: string
  unit?: string
}> = ({ title, colSpan = 3, help, unit }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="pt-4 pb-1 text-xs uppercase tracking-wider text-muted-foreground border-b border-dashed border-border"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          {title}
          {help && <HelpTip text={help} />}
        </span>
        {unit && <span className="font-mono normal-case">{unit}</span>}
      </div>
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

// Shared per-row visual model — both CalcRow (3-col) and RevRow (4-col)
// derive their padding / divider / weight from the same flags so the two
// column models stay byte-identical where they overlap.
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

// Row visual conventions:
//   - Plain row: raw input / step. No flags.
//   - Sub-total / calculated intermediate: pass `severity` only — the dot
//     carries the signal. Never combine with `bold`; bold is reserved for
//     section conclusions / totals.
//   - Section conclusion: `separator` + `bold` + `large`.
//   - Total: `total` (implies separator + bold + large + divider above).
export const CalcRow: React.FC<{
  label: string
  help?: string
  secondary?: string
  value?: string
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
  severity?: Severity
}> = ({
  label,
  help,
  secondary,
  value,
  bold,
  large,
  separator,
  total,
  severity,
}) => {
  const tone = severity ? SEVERITY_TONE[severity] : undefined
  const { bld, lg, cellPad, sepBorder } = rowStyle({
    bold,
    large,
    separator,
    total,
  })
  // When a row has only `secondary` (informational metadata like an epoch
  // count or a percentage) and no primary `value`, render the secondary in
  // the rightmost column so every number in the table right-aligns to the
  // same x-position. Without this, rows shimmy between two columns.
  const showSecondary = secondary && value
  const rightCell = value ?? secondary ?? ''
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
        <span className="inline-flex items-center gap-1.5">
          {label}
          {help && <HelpTip text={help} />}
        </span>
      </td>
      <td className={cn(MID_CELL, cellPad, sepBorder)}>
        {showSecondary ? secondary : ''}
      </td>
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
        {rightCell}
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

// 4-column row for the bid/cost-PMPE breakdowns: label | pct | pmpe | value.
// The pct and pmpe columns are the build-up; value is the SOL conclusion.
// Rows that don't use a column leave it blank — one consistent column model
// per table (never mixed with CalcRow in the same <table>). The shared unit
// for the pmpe / value columns lives in the SectionHeader, not per row.
export const RevRow: React.FC<{
  label: string
  help?: string
  pct?: string
  pmpe?: string
  value?: string
  bold?: boolean
  large?: boolean
  separator?: boolean
  total?: boolean
  severity?: Severity
}> = ({
  label,
  help,
  pct,
  pmpe: pmpeStr,
  value = '',
  bold,
  large,
  separator,
  total,
  severity,
}) => {
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
        <span className="inline-flex items-center gap-1.5">
          {label}
          {help && <HelpTip text={help} />}
        </span>
      </td>
      <td className={cn(MID_CELL, cellPad, sepBorder)}>{pct ?? ''}</td>
      <td className={cn(MID_CELL, cellPad, sepBorder)}>{pmpeStr ?? ''}</td>
      <td
        className={cn(
          'pl-2 text-right font-mono',
          lg ? TEXT_BASE : TEXT_XS,
          cellPad,
          bld && BOLD,
          total ? 'tabular-nums text-foreground' : MUTED,
          sepBorder,
          tone && TONE_TEXT[tone],
        )}
      >
        {value}
      </td>
    </tr>
  )
}

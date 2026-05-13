import React from 'react'
import { Link } from 'react-router-dom'

export function docsPath(level?: string): string {
  return level === 'expert' ? '/expert-docs' : '/docs'
}

// Shared separator visual for "total / result" rows. The same `border-t` is
// used by the overview MetricRow's `separator` prop and by every CalcRow /
// RevRow that marks a section conclusion — keeps the divider style identical
// across the whole dashboard.
export const SEPARATOR_TR_CLASS = 'border-t border-border-grid'
export const SEPARATOR_DIV_CLASS = 'border-t border-border-grid pt-2 mt-1'
// Cell padding for table rows above/below the separator border. The extra
// top space is what makes the total row breathe — a thin border alone reads
// as "more rows below" without it.
export const SEPARATOR_CELL_PAD = 'pt-3 pb-1.5'
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
    className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${MARKER_CLASSES[tone]}`}
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
  return (
    <tr className={'border-b border-border-grid/50 last:border-b-0'}>
      <td
        className={`pr-2 ${lg ? 'text-base' : 'text-xs'} ${sep ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${bld ? 'font-semibold' : ''}`}
      >
        {tone && <Marker tone={tone} />}
        {label}
      </td>
      <td
        className={`px-2 text-right font-mono text-xs text-muted-foreground ${sep ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD}`}
      >
        {secondary ?? ''}
      </td>
      <td
        className={`pl-2 text-right font-mono ${sep ? SEPARATOR_CELL_PAD : NORMAL_CELL_PAD} ${lg ? 'text-base' : 'text-xs'} ${bld ? 'font-semibold' : ''} ${sep ? 'border-t-2 border-border' : ''} ${
          tone === 'red'
            ? 'text-destructive'
            : tone === 'yellow'
              ? 'text-status-yellow'
              : tone === 'green'
                ? 'text-status-green'
                : ''
        }`}
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

const STATUS_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-destructive-light text-destructive',
  yellow: 'bg-status-yellow-light text-status-yellow',
  green: 'bg-primary-light text-primary',
}

export const CalcCard: React.FC<{
  title: string
  guideTo?: string
  isSimulated?: boolean
  status?: { label: string; tone: 'red' | 'yellow' | 'green' }
  tip?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, status, tip, children }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
      {isSimulated && <span className="text-status-yellow">Simulated ·</span>}
      {title}
      {guideTo && (
        <Link
          to={guideTo}
          className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors"
        >
          Guide →
        </Link>
      )}
    </h3>
    {status && (
      <div
        className={`rounded-lg px-3 py-2 text-sm mb-4 ${STATUS_CLASSES[status.tone]}`}
      >
        {status.label}
      </div>
    )}
    {children}
    {tip && <div className="mt-4 pt-3 border-t border-border">{tip}</div>}
  </div>
)

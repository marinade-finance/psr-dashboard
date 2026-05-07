import React from 'react'
import { Link } from 'react-router-dom'

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

export const CalcRow: React.FC<{
  label: string
  secondary?: string
  value: string
  bold?: boolean
  large?: boolean
  accent?: 'red' | 'yellow' | 'green'
  separator?: boolean
}> = ({ label, secondary, value, bold, large, accent, separator }) => (
  <tr
    className={`border-b border-border-grid/50 last:border-0 ${separator ? 'border-t-2 border-t-border' : ''}`}
  >
    <td
      className={`py-1.5 pr-2 text-xs ${bold ? 'font-semibold' : ''} ${large ? 'text-[13px]' : ''}`}
    >
      {label}
    </td>
    <td className="py-1.5 px-2 text-right font-mono text-xs text-muted-foreground">
      {secondary ?? ''}
    </td>
    <td
      className={`py-1.5 pl-2 text-right font-mono ${large ? 'text-sm' : 'text-xs'} ${bold ? 'font-semibold' : ''} ${
        accent === 'red'
          ? 'text-destructive'
          : accent === 'yellow'
            ? 'text-[var(--status-yellow,#b58900)]'
            : accent === 'green'
              ? 'text-[var(--status-green,#2aa198)]'
              : ''
      }`}
    >
      {value}
    </td>
  </tr>
)

export const OkRow: React.FC<{ message: string }> = ({ message }) => (
  <tr>
    <td colSpan={2} className="py-1.5 pr-2 text-xs text-muted-foreground">
      {message}
    </td>
    <td className="py-1.5 pl-2 text-right font-mono text-xs text-[var(--status-green,#2aa198)]">
      ●
    </td>
  </tr>
)

const STATUS_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-destructive-light text-destructive',
  yellow:
    'bg-[var(--status-yellow-light,rgba(181,137,0,0.12))] text-[var(--status-yellow,#b58900)]',
  green: 'bg-primary-light text-primary',
}

export const CalcCard: React.FC<{
  title: string
  helpText?: string
  guideTo?: string
  isSimulated?: boolean
  status?: { label: string; tone: 'red' | 'yellow' | 'green' }
  cta?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, status, cta, children }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
      {isSimulated && (
        <span className="text-[var(--status-yellow,#b58900)]">Simulated ·</span>
      )}
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
    {cta && <div className="mt-4 pt-3 border-t border-border">{cta}</div>}
  </div>
)

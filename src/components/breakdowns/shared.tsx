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

export const CalcRow: React.FC<{
  label: string
  secondary?: string
  value: string
  bold?: boolean
  large?: boolean
  accent?: 'red' | 'yellow' | 'green'
  separator?: boolean
  marker?: 'red' | 'yellow' | 'green'
}> = ({ label, secondary, value, bold, large, accent, separator, marker }) => (
  <tr
    className={`border-b border-border-grid/50 last:border-b-0 ${separator ? 'border-t-2 border-t-border' : ''}`}
  >
    <td
      className={`py-1.5 pr-2 text-xs ${bold ? 'font-semibold' : ''} ${large ? 'text-[13px]' : ''} ${separator ? 'text-foreground' : ''}`}
    >
      {marker && <Marker tone={marker} />}
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
            ? 'text-status-yellow'
            : accent === 'green'
              ? 'text-status-green'
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
  cta?: React.ReactNode
  children: React.ReactNode
}> = ({ title, guideTo, isSimulated, status, cta, children }) => (
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
    {cta && (
      <div
        className={`mt-4 pt-3 border-t ${
          status?.tone === 'red'
            ? 'border-destructive/30'
            : status?.tone === 'yellow'
              ? 'border-status-yellow/30'
              : 'border-border'
        }`}
      >
        {cta}
      </div>
    )}
  </div>
)

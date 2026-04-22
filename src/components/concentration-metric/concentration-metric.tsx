import React from 'react'

import { formatPercentage, formatSolAmount } from 'src/format'
import { tooltipAttributes } from 'src/services/utils'

import styles from './concentration-metric.module.css'

import type { ConcentrationRow } from 'src/services/sam'

type Props = {
  label: string
  rows: ConcentrationRow[]
}

const TOP_N = 3
const TOOLTIP_N = 15

// Distinct, high-contrast colors for top three rows (matches dashboard palette).
const BAR_COLORS = ['#ef4444', '#f59e0b', '#3b82f6']

const DESCRIPTIONS: Record<string, string> = {
  'Top Countries':
    'Share of auction-distributed stake, grouped by validator jurisdiction (country). Concentration caps are enforced by SAM constraints.',
  'Top ASOs':
    'Share of auction-distributed stake, grouped by validator ASO (Autonomous System Operator). Concentration caps are enforced by SAM constraints.',
}

const buildTooltipHtml = (label: string, rows: ConcentrationRow[]): string => {
  const desc = DESCRIPTIONS[label] ?? ''
  const header = desc
    ? `<div style="max-width:320px;font-size:11px;opacity:.8;margin-bottom:6px;line-height:1.35">${desc}</div>`
    : ''
  const subhead = `<div style="font-weight:600;margin-bottom:4px">All (${rows.length})</div>`
  const body = rows
    .slice(0, TOOLTIP_N)
    .map(
      r =>
        `<div style="display:flex;gap:8px;font-size:11px"><span style="flex:1">${r.key}</span><span style="opacity:.6">${r.validatorCount} val</span><span style="font-family:monospace;min-width:48px;text-align:right">${formatPercentage(r.pctOfTotal)}</span><span style="font-family:monospace;min-width:64px;text-align:right;opacity:.7">☉${formatSolAmount(Math.round(r.samStakeSol))}</span></div>`,
    )
    .join('')
  const more =
    rows.length > TOOLTIP_N
      ? `<div style="opacity:.5;font-size:10px;margin-top:4px">+${rows.length - TOOLTIP_N} more</div>`
      : ''
  return header + subhead + body + more
}

export const ConcentrationMetric: React.FC<Props> = ({ label, rows }) => {
  const top = rows.slice(0, TOP_N)
  const maxPct = top[0]?.pctOfTotal ?? 0
  return (
    <div
      className={styles.wrap}
      {...tooltipAttributes(buildTooltipHtml(label, rows))}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.rows}>
        {top.map((r, i) => (
          <div key={r.key} className={styles.row}>
            <span
              className={styles.barFill}
              style={{
                width: `${maxPct > 0 ? (r.pctOfTotal / maxPct) * 100 : 0}%`,
                background: BAR_COLORS[i],
                opacity: 0.8,
              }}
            />
            <span className={styles.rowText}>
              <span className={styles.name} title={r.key}>
                {r.key}
              </span>
              <span className={styles.pct}>
                {formatPercentage(r.pctOfTotal)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

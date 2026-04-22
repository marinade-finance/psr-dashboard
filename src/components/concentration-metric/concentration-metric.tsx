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

const barColor = (pct: number): string => {
  if (pct >= 0.1) return 'var(--red)'
  if (pct >= 0.07) return 'var(--orange)'
  return 'var(--teal)'
}

const buildTooltipHtml = (rows: ConcentrationRow[]): string => {
  const head = `<div style="font-weight:600;margin-bottom:4px">All (${rows.length})</div>`
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
  return head + body + more
}

export const ConcentrationMetric: React.FC<Props> = ({ label, rows }) => {
  const top = rows.slice(0, TOP_N)
  const maxPct = top[0]?.pctOfTotal ?? 0
  return (
    <div className={styles.wrap} {...tooltipAttributes(buildTooltipHtml(rows))}>
      <div className={styles.label}>{label}</div>
      <div className={styles.rows}>
        {top.map(r => (
          <div key={r.key} className={styles.row}>
            <span className={styles.name} title={r.key}>
              {r.key}
            </span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                style={{
                  width: `${maxPct > 0 ? (r.pctOfTotal / maxPct) * 100 : 0}%`,
                  background: barColor(r.pctOfTotal),
                }}
              />
            </span>
            <span className={styles.pct}>{formatPercentage(r.pctOfTotal)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

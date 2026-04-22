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

const BAR_COLORS = ['#6a8ca8', '#b0946a', '#8aa598']
const CAP_COLOR = '#c65d5d'

const DESCRIPTIONS: Record<string, string> = {
  'Top Countries':
    'Share of auction-distributed stake, grouped by validator jurisdiction (country). SAM enforces a per-country cap — a row marked (capped) has at least one validator whose stake was cut by the country cap.',
  'Top ASOs':
    'Share of auction-distributed stake, grouped by validator ASO (Autonomous System Operator). SAM enforces a per-ASO cap — a row marked (capped) has at least one validator whose stake was cut by the ASO cap.',
}

const PAD = 'padding:2px 6px'
const MONO = 'font-family:monospace'

const td = (content: string, align: 'left' | 'right' = 'left', opts = '') =>
  `<td style="${PAD};text-align:${align};${opts}">${content}</td>`

const th = (content: string, align: 'left' | 'right') =>
  `<th style="${PAD};text-align:${align}">${content}</th>`

const buildTooltipHtml = (label: string, rows: ConcentrationRow[]): string => {
  const desc = DESCRIPTIONS[label] ?? ''
  const header = desc
    ? `<div style="max-width:360px;font-size:11px;opacity:.8;margin-bottom:6px;line-height:1.35">${desc}</div>`
    : ''
  const subhead = `<div style="font-weight:600;margin-bottom:4px">All (${rows.length})</div>`
  const head = `<thead><tr style="font-size:12px;opacity:.55;text-transform:uppercase;letter-spacing:.04em">${th('Name', 'left')}${th('Share', 'right')}${th('Stake', 'right')}${th('Validators', 'right')}${th('Cap', 'right')}</tr></thead>`
  const body = rows
    .slice(0, TOOLTIP_N)
    .map((r, i) => {
      const swatch = BAR_COLORS[i] ?? 'transparent'
      const nameCell = td(
        `<span style="display:inline-block;width:3px;height:12px;background:${swatch};border-radius:2px;flex-shrink:0"></span>${r.key}`,
        'left',
        'display:flex;align-items:center;gap:6px',
      )
      const capCell = r.atCap
        ? td(
            `(capped) ${r.cappedValidatorCount}`,
            'right',
            `color:${CAP_COLOR};font-weight:700;font-size:12px`,
          )
        : td('—', 'right', 'opacity:.4')
      return `<tr>${nameCell}${td(formatPercentage(r.pctOfTotal), 'right', MONO)}${td(`☉${formatSolAmount(Math.round(r.samStakeSol))}`, 'right', `${MONO};opacity:.75`)}${td(String(r.validatorCount), 'right', 'opacity:.75')}${capCell}</tr>`
    })
    .join('')
  const more =
    rows.length > TOOLTIP_N
      ? `<div style="opacity:.5;font-size:12px;margin-top:4px">+${rows.length - TOOLTIP_N} more</div>`
      : ''
  return `${header}${subhead}<table style="font-size:11px;border-collapse:collapse">${head}<tbody>${body}</tbody></table>${more}`
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
                background: r.atCap ? CAP_COLOR : BAR_COLORS[i],
                opacity: 0.8,
              }}
            />
            <span className={styles.rowText}>
              <span
                className={styles.name}
                title={r.key}
                style={
                  r.atCap ? { color: CAP_COLOR, fontWeight: 700 } : undefined
                }
              >
                {r.key}
                {r.atCap && (
                  <span
                    style={{ marginLeft: 6, fontWeight: 700, fontSize: 10 }}
                  >
                    (capped)
                  </span>
                )}
              </span>
              <span
                className={styles.pct}
                style={r.atCap ? { color: CAP_COLOR } : undefined}
              >
                {formatPercentage(r.pctOfTotal)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

import React from 'react'

import {
  cell,
  ctaBlock,
  esc,
  rowCells,
  sectionHeader,
  tableHead,
  wrapTable,
} from 'src/components/tooltip-table/tooltip-table'
import { formatPercentage, formatSolAmount } from 'src/format'
import { tooltipAttributes } from 'src/services/utils'
import { BAR_COLORS, CAP_COLOR } from 'src/styles/colors'

import styles from './concentration-metric.module.css'

import type { ConcentrationRow } from 'src/services/sam'

type Props = {
  label: string
  rows: ConcentrationRow[]
  capPct: number
}

const TOP_N = 3
const TOOLTIP_N = 15

const DESCRIPTIONS: Record<string, string> = {
  'Top Countries':
    'Share of auction-distributed stake, grouped by validator jurisdiction (country). SAM enforces a per-country concentration cap — bar fill reflects share relative to the cap (full bar = at cap). A row marked (capped) has at least one validator whose stake was cut by the cap.',
  'Top ASOs':
    'Share of auction-distributed stake, grouped by validator ASO (Autonomous System Operator). SAM enforces a per-ASO concentration cap — bar fill reflects share relative to the cap (full bar = at cap). A row marked (capped) has at least one validator whose stake was cut by the cap.',
}

const buildTooltipHtml = (
  label: string,
  rows: ConcentrationRow[],
  capPct: number,
): string => {
  const desc = DESCRIPTIONS[label] ?? ''
  const capNote = `Cap: ${formatPercentage(capPct)} of network stake.`
  const cta = ctaBlock({ label, lead: `${desc} ${capNote}` })
  const head =
    sectionHeader(`Breakdown (${rows.length})`, 4) +
    tableHead(['Name', 'Share', 'Stake', 'Cap'])
  const body = rows
    .slice(0, TOOLTIP_N)
    .map(r => {
      const name = `${esc(r.key)} <span class="tt-muted">(${r.validatorCount})</span>`
      const capText = r.atCap ? `(capped) ${r.cappedValidatorCount}` : '—'
      return rowCells([
        cell(name, { wrap: true }),
        cell(formatPercentage(r.pctOfTotal), { align: 'right', mono: true }),
        cell(`☉${formatSolAmount(Math.round(r.samStakeSol))}`, {
          align: 'right',
          mono: true,
          muted: true,
        }),
        r.atCap
          ? cell(capText, { align: 'right', bold: true, accent: 'red' })
          : cell(capText, { align: 'right', muted: true }),
      ])
    })
    .join('')
  const more =
    rows.length > TOOLTIP_N
      ? `<div class="tt-muted">+${rows.length - TOOLTIP_N} more</div>`
      : ''
  return cta + wrapTable(head + body) + more
}

export const ConcentrationMetric: React.FC<Props> = ({
  label,
  rows,
  capPct,
}) => {
  const top = rows.slice(0, TOP_N)
  return (
    <div
      className={styles.wrap}
      {...tooltipAttributes(buildTooltipHtml(label, rows, capPct))}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.rows}>
        {top.map((r, i) => {
          const fill = capPct > 0 ? Math.min(r.pctOfTotal / capPct, 1) * 100 : 0
          return (
            <div key={r.key} className={styles.row}>
              <span
                className={styles.barFill}
                style={{
                  width: `${fill}%`,
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
                    <span style={{ marginLeft: 6, fontWeight: 700 }}>
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
          )
        })}
      </div>
    </div>
  )
}

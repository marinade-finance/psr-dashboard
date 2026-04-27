import React from 'react'

import type { EpochValue } from 'src/services/sam'

import styles from './sparkline.module.css'

export type SparklinePoint = EpochValue

type Props = {
  data: EpochValue[]
  width?: number
  height?: number
}

// Marinade signature mint green; matches accent used across the brand.
const ACCENT = '#20cd83'

let gradSeq = 0
function nextGradId(): string {
  gradSeq += 1
  return `sl-g-${gradSeq}`
}

type Norm = {
  points: { x: number; y: number }[]
  min: number
  max: number
}

function normalize(
  data: EpochValue[],
  width: number,
  height: number,
  padT: number,
  padB: number,
): Norm {
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = data.length > 1 ? width / (data.length - 1) : 0
  const yRange = height - padT - padB
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: padT + yRange - ((d.value - min) / span) * yRange,
  }))
  return { points, min, max }
}

export const Sparkline: React.FC<Props> = ({
  data,
  width = 100,
  height = 28,
}) => {
  const gradId = React.useMemo(nextGradId, [])
  if (data.length < 2) return null
  const { points } = normalize(data, width, height, 3, 3)
  const linePts = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPts = `0,${height} ${linePts} ${width},${height}`
  const last = points[points.length - 1]
  return (
    <svg
      className={styles.svg}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline className={styles.line} points={linePts} />
      <circle className={styles.dotHalo} cx={last.x} cy={last.y} r={3.5} />
      <circle className={styles.dot} cx={last.x} cy={last.y} r={1.75} />
    </svg>
  )
}

// HTML string for react-tooltip's data-tooltip-html. Standalone (no React).
export function sparklineHtml(
  data: EpochValue[],
  format: (v: number) => string,
  title: string,
): string {
  if (data.length < 2) {
    return [
      `<div style="font-weight:600;margin-bottom:4px;color:#fbfbfe">${title}</div>`,
      `<div style="opacity:0.7">not enough data</div>`,
    ].join('')
  }
  const W = 380
  const H = 140
  const padL = 56
  const padR = 14
  const padT = 12
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mid = (min + max) / 2
  const span = max - min || 1
  const stepX = innerW / (data.length - 1)
  const points = data.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + innerH - ((d.value - min) / span) * innerH
    return { x, y }
  })
  const linePts = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPts = `${padL},${padT + innerH} ${linePts} ${padL + innerW},${padT + innerH}`
  const last = points[points.length - 1]
  const firstEpoch = data[0].epoch
  const lastEpoch = data[data.length - 1].epoch
  const latest = data[data.length - 1].value
  const stroke = ACCENT
  const grid = 'rgba(255,255,255,0.08)'
  const text = '#b8b8bc'
  const textBright = '#fbfbfe'
  const yMid = padT + innerH / 2
  // Random suffix not needed — tooltip recreates DOM each open. But be safe.
  const gid = `sltt-${Math.floor(Math.random() * 1e9)}`

  return [
    `<div style="font-family:monospace;color:${textBright}">`,
    `<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:${textBright}">${title}</div>`,
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">`,
    `<defs>`,
    `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${stroke}" stop-opacity="0.30"/>`,
    `<stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>`,
    `</linearGradient>`,
    `</defs>`,
    // Gridlines: top, mid, bottom of plot area.
    `<line x1="${padL}" y1="${padT}" x2="${padL + innerW}" y2="${padT}" stroke="${grid}" stroke-width="1"/>`,
    `<line x1="${padL}" y1="${yMid}" x2="${padL + innerW}" y2="${yMid}" stroke="${grid}" stroke-width="1" stroke-dasharray="2 3"/>`,
    `<line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="${grid}" stroke-width="1"/>`,
    // Y labels at min/mid/max.
    `<text x="${padL - 6}" y="${padT + 4}" text-anchor="end" style="font:10px monospace;fill:${text}">${format(max)}</text>`,
    `<text x="${padL - 6}" y="${yMid + 3}" text-anchor="end" style="font:10px monospace;fill:${text};opacity:0.7">${format(mid)}</text>`,
    `<text x="${padL - 6}" y="${padT + innerH + 3}" text-anchor="end" style="font:10px monospace;fill:${text}">${format(min)}</text>`,
    // Epoch axis labels.
    `<text x="${padL}" y="${H - 8}" text-anchor="start" style="font:10px monospace;fill:${text}">ep ${firstEpoch}</text>`,
    `<text x="${padL + innerW}" y="${H - 8}" text-anchor="end" style="font:10px monospace;fill:${text}">ep ${lastEpoch}</text>`,
    // Area + line + dot.
    `<polygon points="${areaPts}" fill="url(#${gid})"/>`,
    `<polyline fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" points="${linePts}"/>`,
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${stroke}" opacity="0.25"/>`,
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.25" fill="${stroke}"/>`,
    `</svg>`,
    // Footer: aligned columns instead of bullet-separated text.
    `<div style="margin-top:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font:11px monospace;color:${text}">`,
    `<div><div style="opacity:0.6">min</div><div style="color:${textBright}">${format(min)}</div></div>`,
    `<div><div style="opacity:0.6">latest</div><div style="color:${stroke};font-weight:600">${format(latest)}</div></div>`,
    `<div style="text-align:right"><div style="opacity:0.6">max</div><div style="color:${textBright}">${format(max)}</div></div>`,
    `</div>`,
    `</div>`,
  ].join('')
}

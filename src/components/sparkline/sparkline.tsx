import React from 'react'

import type { EpochValue } from 'src/services/sam'

export type SparklinePoint = EpochValue

type Props = {
  data: EpochValue[]
  width?: number
  height?: number
  stroke?: string
}

function normalize(
  data: EpochValue[],
  width: number,
  height: number,
): { points: { x: number; y: number }[]; min: number; max: number } {
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = data.length > 1 ? width / (data.length - 1) : 0
  const yPad = 1
  const yRange = height - 2 * yPad
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - yPad - ((d.value - min) / span) * yRange,
  }))
  return { points, min, max }
}

export const Sparkline: React.FC<Props> = ({
  data,
  width = 90,
  height = 24,
  stroke = 'currentColor',
}) => {
  if (data.length < 2) return null
  const { points } = normalize(data, width, height)
  const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', opacity: 0.85 }}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={path}
      />
      <circle cx={last.x} cy={last.y} r={1.75} fill={stroke} />
    </svg>
  )
}

export function sparklineHtml(
  data: EpochValue[],
  format: (v: number) => string,
  title: string,
): string {
  if (data.length < 2) {
    return `<div style="font-weight:600;margin-bottom:4px">${title}</div><div style="opacity:0.7">not enough data</div>`
  }
  const W = 320
  const H = 110
  const padL = 56
  const padR = 12
  const padT = 8
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + innerH - ((d.value - min) / span) * innerH
    return { x, y }
  })
  const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const firstEpoch = data[0].epoch
  const lastEpoch = data[data.length - 1].epoch
  const latest = data[data.length - 1].value
  const stroke = '#7ad'
  const axis = '#888'
  const text = '#ccc'

  return [
    `<div style="font-weight:600;margin-bottom:6px">${title}</div>`,
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">`,
    `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="${axis}" stroke-width="1"/>`,
    `<line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="${axis}" stroke-width="1"/>`,
    `<text x="${padL - 4}" y="${padT + 4}" text-anchor="end" style="font-size:10px;fill:${text}">${format(max)}</text>`,
    `<text x="${padL - 4}" y="${padT + innerH}" text-anchor="end" style="font-size:10px;fill:${text}">${format(min)}</text>`,
    `<text x="${padL}" y="${H - 6}" text-anchor="start" style="font-size:10px;fill:${text}">ep ${firstEpoch}</text>`,
    `<text x="${padL + innerW}" y="${H - 6}" text-anchor="end" style="font-size:10px;fill:${text}">ep ${lastEpoch}</text>`,
    `<polyline fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" points="${polyline}"/>`,
    `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.5" fill="${stroke}"/>`,
    `</svg>`,
    `<div style="margin-top:4px;font-size:11px;opacity:0.8">latest: ${format(latest)} · min: ${format(min)} · max: ${format(max)}</div>`,
  ].join('')
}

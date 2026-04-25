import { Color } from 'src/components/table/table'

import './tooltip-table.css'

export type CellOpts = {
  bold?: boolean
  large?: boolean
  align?: 'left' | 'right'
  muted?: boolean
  mono?: boolean
  wrap?: boolean
  // Semantic accent color (maps to CSS class).
  accent?: 'red' | 'orange' | 'yellow' | 'green'
  colspan?: number
}

export type Cell = { text: string; opts?: CellOpts }

export const cell = (text: string, opts?: CellOpts): Cell => ({ text, opts })

const cellClasses = (opts?: CellOpts): string => {
  const cls: string[] = []
  const align = opts?.align ?? 'left'
  cls.push(align === 'right' ? 'tt-right' : 'tt-left')
  if (opts?.bold) cls.push('tt-bold')
  if (opts?.large) cls.push('tt-large')
  if (opts?.muted) cls.push('tt-muted')
  if (opts?.mono) cls.push('tt-mono')
  if (opts?.wrap) cls.push('tt-wrap')
  if (opts?.accent) cls.push(`tt-accent-${opts.accent}`)
  return cls.join(' ')
}

export const rowCells = (cells: Cell[]): string => {
  const tds = cells
    .map(c => {
      const cs = c.opts?.colspan ? ` colspan="${c.opts.colspan}"` : ''
      return `<td${cs} class="${cellClasses(c.opts)}">${c.text}</td>`
    })
    .join('')
  return `<tr>${tds}</tr>`
}

// Convenience: label / qty / value — bond-style three-column row.
export const row = (
  label: string,
  qty: string,
  value: string,
  opts?: {
    boldLabel?: boolean
    boldValue?: boolean
    large?: boolean
    accent?: CellOpts['accent']
  },
): string =>
  rowCells([
    cell(label, {
      bold: opts?.boldLabel,
      large: opts?.large,
      wrap: true,
    }),
    cell(qty, { align: 'right', muted: true, mono: true }),
    cell(value, {
      align: 'right',
      mono: true,
      bold: opts?.boldValue,
      large: opts?.large,
      accent: opts?.accent,
    }),
  ])

export const sectionHeader = (title: string, cols = 3): string =>
  `<tr><td colspan="${cols}" class="tt-rule-spacer"></td></tr>` +
  `<tr><td colspan="${cols}" class="tt-rule">${title}</td></tr>`

export const tableHead = (headers: string[]): string => {
  const ths = headers
    .map(
      (h, i) =>
        `<th class="tt-head ${i === 0 ? 'tt-left' : 'tt-right'}">${h}</th>`,
    )
    .join('')
  return `<tr>${ths}</tr>`
}

export const divider = (cols = 3): string =>
  `<tr><td colspan="${cols}" class="tt-divider"></td></tr>`

export const okRow = (message: string, cols = 3): string =>
  `<tr><td colspan="${cols - 1}" class="tt-ok-msg">${message}</td>` +
  '<td class="tt-right tt-mono tt-accent-green">●</td></tr>'

export const stateClass = (c?: Color): string => {
  switch (c) {
    case Color.RED:
      return 'tt-state-red'
    case Color.ORANGE:
      return 'tt-state-orange'
    case Color.YELLOW:
      return 'tt-state-yellow'
    case Color.GREEN:
      return 'tt-state-green'
    default:
      return ''
  }
}

export const ctaBlock = (p: {
  label: string
  lead?: string
  cta?: string
  state?: Color
}): string => {
  const st = stateClass(p.state)
  const lead = p.lead ? `<div class="tt-cta-lead">${p.lead}</div>` : ''
  const cta = p.cta ? `<div class="tt-cta ${st}">${p.cta}</div>` : ''
  return `<div class="tt-cta-label">${p.label}</div>${lead}${cta}`
}

export const wrapTable = (body: string): string =>
  `<table class="tt-table">${body}</table>`

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const esc = (s: string): string => s.replace(/[&<>"']/g, c => ESC_MAP[c])

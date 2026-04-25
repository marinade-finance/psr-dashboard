import React from 'react'

import { formatSolAmount } from 'src/format'
import {
  selectExpectedStakeChange,
  selectSamActiveStake,
} from 'src/services/sam'

import type { AugmentedAuctionValidator } from 'src/services/sam'

type Kind = 'none' | 'dot' | 'arrows'

const arrowCount = (ratio: number): number =>
  ratio < 0.01 ? 0 : ratio < 0.3 ? 1 : ratio < 0.8 ? 2 : 3

export const StakeChangeIndicator: React.FC<{
  validator: AugmentedAuctionValidator
}> = ({ validator }) => {
  const active = selectSamActiveStake(validator)
  const delta = selectExpectedStakeChange(validator)
  const base = active > 0 ? active : Math.abs(delta)
  const ratio = base > 0 ? Math.abs(delta) / base : 0
  const arrows = arrowCount(ratio)
  const kind: Kind = delta === 0 ? 'none' : arrows === 0 ? 'dot' : 'arrows'
  const color = delta > 0 ? 'rgb(80,220,150)' : 'rgb(250,120,120)'
  const glyph =
    kind === 'arrows'
      ? (delta > 0 ? '↑' : '↓').repeat(arrows)
      : kind === 'dot'
        ? '●'
        : '\u00A0'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4em',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '1em',
          height: '1em',
          overflow: 'visible',
          color: kind !== 'none' ? color : undefined,
          opacity: kind === 'none' ? 0 : 1,
          fontSize: kind === 'arrows' ? '1.8em' : '0.7em',
          fontWeight: 800,
          letterSpacing: kind === 'arrows' ? '-0.15em' : 'normal',
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      <span>{formatSolAmount(active, 0)}</span>
    </span>
  )
}

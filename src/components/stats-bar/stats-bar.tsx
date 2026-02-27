import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatSolAmount, formatPercentage } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'

interface StatsBarProps {
  totalAuctionStake: number
  winningApy: number
  projectedApy: number
  winningCount: number
  totalValidators: number
}

export const StatsBar = ({
  totalAuctionStake,
  winningApy,
  projectedApy,
  winningCount,
  totalValidators,
}: StatsBarProps) => {
  return (
    <div className="font-mono text-[12px] leading-[1.8] mb-4">
      <span className="text-muted-foreground">{':: '}</span>
      TOTAL AUCTION STAKE{' '}
      <span className="font-bold">
        {formatSolAmount(totalAuctionStake, 0)}◎
      </span>
      {'    '}
      <span className="text-muted-foreground">{':: '}</span>
      WINNING APY{' '}
      <span className="font-bold">{formatPercentage(winningApy, 2)}</span>
      <HelpTip text={HELP_TEXT.winningApy} />
      {'    '}
      <span className="text-muted-foreground">{':: '}</span>
      PROJECTED APY{' '}
      <span className="font-bold">{formatPercentage(projectedApy, 2)}</span>
      {'    '}
      <span className="text-muted-foreground">{':: '}</span>
      WINNING{' '}
      <span className="font-bold">
        {winningCount} / {totalValidators}
      </span>
    </div>
  )
}

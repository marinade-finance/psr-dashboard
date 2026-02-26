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
  const stats: {
    label: string
    value: string
    unit: string
    help: string | undefined
  }[] = [
    {
      label: 'Total Auction Stake',
      value: formatSolAmount(totalAuctionStake, 0),
      unit: '\u25CE',
      help: undefined,
    },
    {
      label: 'Winning APY',
      value: formatPercentage(winningApy, 2),
      unit: '',
      help: HELP_TEXT.winningApy,
    },
    {
      label: 'Projected APY',
      value: formatPercentage(projectedApy, 2),
      unit: '',
      help: undefined,
    },
    {
      label: 'Winning Validators',
      value: `${winningCount} / ${totalValidators}`,
      unit: '',
      help: undefined,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-card rounded-xl px-5 py-4 border border-border shadow-xs"
        >
          <div className="text-2xs text-muted-foreground mb-1 font-sans flex items-center">
            {stat.label}
            {stat.help && <HelpTip text={stat.help} />}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[22px] font-semibold text-foreground font-mono">
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-sm text-muted-foreground font-mono">
                {stat.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

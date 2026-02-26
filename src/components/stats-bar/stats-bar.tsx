import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatSolAmount, formatPercentage } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'

import styles from './stats-bar.module.css'

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
    <div className={styles.container}>
      {stats.map(stat => (
        <div key={stat.label} className={styles.card}>
          <div className={styles.label}>
            {stat.label}
            {stat.help && <HelpTip text={stat.help} />}
          </div>
          <div className={styles.valueContainer}>
            <span className={styles.value}>{stat.value}</span>
            {stat.unit && <span className={styles.unit}>{stat.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

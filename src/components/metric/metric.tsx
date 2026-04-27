import React from 'react'

import styles from './metric.module.css'

type Props = {
  label: string
  value: React.ReactNode
  secondary?: React.ReactNode
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  secondary,
  ...tooltipsProps
}) => {
  return (
    <div className={styles.metricWrap} {...tooltipsProps}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        <span className={styles.primary}>{value}</span>
        {secondary !== undefined && secondary !== null && secondary !== '' && (
          <span className={styles.secondary}>{secondary}</span>
        )}
      </div>
    </div>
  )
}

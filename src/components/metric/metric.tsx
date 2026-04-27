import React from 'react'

import styles from './metric.module.css'

type Props = {
  label: string
  value: React.ReactNode
  secondary?: React.ReactNode
  secondaryLabel?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  secondary,
  secondaryLabel,
  ...tooltipsProps
}) => {
  const hasSecondary =
    secondary !== undefined && secondary !== null && secondary !== ''
  return (
    <div className={styles.metricWrap} {...tooltipsProps}>
      <div className={styles.stacks}>
        <div className={styles.stack}>
          <div className={styles.label}>{label}</div>
          <div className={styles.primary}>{value}</div>
        </div>
        {hasSecondary && (
          <div className={`${styles.stack} ${styles.secondaryStack}`}>
            {secondaryLabel && (
              <div className={styles.secondaryLabel}>{secondaryLabel}</div>
            )}
            <div className={styles.secondary}>{secondary}</div>
          </div>
        )}
      </div>
    </div>
  )
}

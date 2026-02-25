import React from 'react'

import styles from './metric.module.css'

type Props = {
  label: string
  value: string
  subtitle?: string
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({
  label,
  value,
  subtitle,
  ...tooltipsProps
}) => {
  return (
    <div className={styles.metricWrap} {...tooltipsProps}>
      <div>{label}</div>
      <div>{value}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  )
}

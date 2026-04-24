import React from 'react'

import styles from './metric.module.css'

type Props = {
  label: string
  value: React.ReactNode
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({ label, value, ...tooltipsProps }) => {
  return (
    <div className={styles.metricWrap} {...tooltipsProps}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  )
}

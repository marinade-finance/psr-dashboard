import React from 'react'

import styles from './complex-metric.module.css'

type Props = {
  label: string
  value: React.ReactNode
  tooltipHtml?: string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

export const ComplexMetric: React.FC<Props> = ({
  label,
  value,
  ...tooltipsProps
}) => {
  return (
    <div className={styles.complexMetricWrap} {...tooltipsProps}>
      <div>{label}</div>
      {value}
    </div>
  )
}

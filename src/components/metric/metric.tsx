import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import styles from './metric.module.css'

type Props = {
    label: string
    value: string
    tooltipHtml?: string
    'data-tooltip-id'?: string
    'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({ label, value, ...tooltipsProps }) => {
    return <div className={styles.metricWrap} {...tooltipsProps}>
        <div>{label}</div>
        <div>{value}</div>
    </div>
};

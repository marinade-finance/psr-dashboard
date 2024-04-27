import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import styles from './metric.module.css'

type Props = {
    label: string
    value: string
    tooltipHtml?: string
    'data-tooltip-id'?: string
    'data-tooltip-html'?: string
}

export const Metric: React.FC<Props> = ({ label, value, ...toltipsProps }) => {
    return <div className={styles.metricWrap} data-tooltip-id={toltipsProps["data-tooltip-id"]} data-tooltip-html={toltipsProps["data-tooltip-html"]}>
        <div>{label}</div>
        <div>{value}</div>
    </div>
};

import React from "react";
import styles from './banner.module.css'

export type Props = {
    title: string
    body: JSX.Element
    tooltipHtml?: string
    'data-tooltip-id'?: string
    'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, body, ...tooltipsProps }) => {
    return <div className={styles.bannerShoutout} {...tooltipsProps}>
      <div><strong>{title}</strong>{body}</div>
    </div>
};

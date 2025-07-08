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
    if (!title) {
      return
    }
    return <div className={styles.bannerShoutout} {...tooltipsProps}>
      <div>
        <div className={styles.bannerTitle}><strong>{title}</strong></div>
        {body}
      </div>
    </div>
};

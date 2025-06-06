import React from "react";
import styles from './banner.module.css'

export type Props = {
    title: string
    text: string
    url: string
    tooltipHtml?: string
    'data-tooltip-id'?: string
    'data-tooltip-html'?: string
}

export const Banner: React.FC<Props> = ({ title, text, url, ...tooltipsProps }) => {
    return <div className={styles.bannerShoutout} {...tooltipsProps}>
      <div><strong>{title}: </strong>{text}<br/>read more: <a href={url}>{url}</a></div>
    </div>
};

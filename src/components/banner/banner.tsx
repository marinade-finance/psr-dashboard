import React from 'react'

import styles from './banner.module.css'

export type Props = {
  title: string
  body: JSX.Element | string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/g

function linkify(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let last = 0
  let key = 0
  for (const match of text.matchAll(URL_REGEX)) {
    const url = match[0]
    const offset = match.index ?? 0
    if (offset > last) parts.push(text.slice(last, offset))
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    )
    last = offset + url.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function messageToJsx(message: string): JSX.Element {
  const lines = message.split('\n').filter(line => line.trim() !== '')
  return (
    <>
      {lines.map((line, i) => (
        <p key={i}>{linkify(line)}</p>
      ))}
    </>
  )
}

export const Banner: React.FC<Props> = ({ title, body, ...tooltipsProps }) => {
  if (!title) {
    return null
  }
  return (
    <div className={styles.bannerShoutout} {...tooltipsProps}>
      <div>
        <div className={styles.bannerTitle}>
          <strong>{title}</strong>
        </div>
        {typeof body === 'string' ? messageToJsx(body) : body}
      </div>
    </div>
  )
}

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import styles from './banner.module.css'

export type Props = {
  title: string
  body: JSX.Element | string
  'data-tooltip-id'?: string
  'data-tooltip-html'?: string
}

const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'a',
  'code',
  'ul',
  'ol',
  'li',
  'br',
  'del',
]

const MARKDOWN_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
}

const urlTransform = (url: string): string => (/^https?:/i.test(url) ? url : '')

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
        {typeof body === 'string' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            allowedElements={ALLOWED_ELEMENTS}
            components={MARKDOWN_COMPONENTS}
            urlTransform={urlTransform}
          >
            {body}
          </ReactMarkdown>
        ) : (
          body
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'

import styles from './help-tip.module.css'

interface HelpTipProps {
  text: string
}

export const HelpTip = ({ text }: HelpTipProps) => {
  const [show, setShow] = useState(false)

  return (
    <span className={styles.container}>
      <span
        className={styles.trigger}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        role="button"
        aria-label="Help"
      >
        ?
      </span>
      {show && (
        <div className={styles.tooltip}>
          {text}
          <div className={styles.arrow} />
        </div>
      )}
    </span>
  )
}

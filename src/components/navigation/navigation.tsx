import React from 'react'
import { NavLink } from 'react-router-dom'

import styles from './navigation.module.css'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? styles.active : ''

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const isExpert = level === UserLevel.Expert
  const prefix = isExpert ? 'expert-' : ''
  return (
    <div className={styles.navigation}>
      <NavLink to={`/${prefix}`} className={navClass}>
        <div className={styles.navButton}>Stake Auction Marketplace</div>
      </NavLink>
      <NavLink to={`/${prefix}protected-events`} className={navClass}>
        <div className={styles.navButton}>Protected Events</div>
      </NavLink>
      <NavLink to={`/${prefix}bonds`} className={navClass}>
        <div className={styles.navButton}>Validator Bonds</div>
      </NavLink>
      <a
        href={isExpert ? '/docs/?from=expert' : '/docs/'}
        className={styles.docsButton}
        style={{ marginLeft: 'auto' }}
      >
        Docs
      </a>
      {isExpert && (
        <a href="/docs/?from=expert#GUIDE-EXPERT" className={styles.docsButton}>
          Expert Guide
        </a>
      )}
      {children}
    </div>
  )
}

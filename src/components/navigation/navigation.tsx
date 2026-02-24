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
  const expert = level === UserLevel.Expert ? 'expert-' : ''
  return (
    <div className={styles.navigation}>
      <NavLink to={`/${expert}`} className={navClass}>
        <div className={styles.navButton}>Stake Auction Marketplace</div>
      </NavLink>
      <NavLink to={`/${expert}protected-events`} className={navClass}>
        <div className={styles.navButton}>Protected Events</div>
      </NavLink>
      <NavLink to={`/${expert}bonds`} className={navClass}>
        <div className={styles.navButton}>Validator Bonds</div>
      </NavLink>
      <a
        href={`${expert}docs/`}
        className={styles.docsButton}
        style={{ marginLeft: 'auto' }}
      >
        Docs
      </a>
      {level === UserLevel.Expert && (
        <a href={`${expert}docs/#GUIDE-EXPERT`} className={styles.docsButton}>
          Expert Guide
        </a>
      )}
      {children}
    </div>
  )
}

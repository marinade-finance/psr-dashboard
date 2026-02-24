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

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const expert = level === UserLevel.Expert ? 'expert-' : ''
  return (
    <div className={styles.navigation}>
      <NavLink
        to={`/${expert}`}
        className={({ isActive, isPending: _isPending }) =>
          isActive ? styles.active : ''
        }
      >
        <div className={styles.navButton}>Stake Auction Marketplace</div>
      </NavLink>
      <NavLink
        to={`/${expert}protected-events`}
        className={({ isActive, isPending: _isPending }) =>
          isActive ? styles.active : ''
        }
      >
        <div className={styles.navButton}>Protected Events</div>
      </NavLink>
      <NavLink
        to={`/${expert}bonds`}
        className={({ isActive, isPending: _isPending }) =>
          isActive ? styles.active : ''
        }
      >
        <div className={styles.navButton}>Validator Bonds</div>
      </NavLink>
      <a
        href={`docs/?from=${expert}`}
        className={styles.docsButton}
        style={{ marginLeft: 'auto' }}
      >
        Docs
      </a>
      {level === UserLevel.Expert && (
        <a
          href={`docs/?from=${expert}&doc=GUIDE-EXPERT`}
          className={styles.docsButton}
        >
          Expert Guide
        </a>
      )}
      {children}
    </div>
  )
}

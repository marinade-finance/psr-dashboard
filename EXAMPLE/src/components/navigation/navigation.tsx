import React from 'react'
import { NavLink } from 'react-router-dom'

import styles from './navigation.module.css'

export const Navigation: React.FC = () => {
  return (
    <div className={styles.navigation}>
      <NavLink
        to={'/'}
        className={({ isActive }) => (isActive ? styles.active : '')}
      >
        <div className={styles.navButton}>Select Validators</div>
      </NavLink>
      <NavLink
        to={'/select'}
        className={({ isActive }) => (isActive ? styles.active : '')}
      >
        <div className={styles.navButton}>Select Settlements</div>
      </NavLink>
    </div>
  )
}

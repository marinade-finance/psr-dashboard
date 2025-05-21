import React, { useEffect, useMemo, useState } from "react";
import styles from './navigation.module.css'
import { NavLink } from "react-router-dom";

export enum UserLevel {
    Basic = 'basic',
    Expert = 'expert',
}

export type UserLevelProps = {
    level?: UserLevel
}

export const Navigation: React.FC<UserLevelProps> = ({ level }) => {
    const expert = level == UserLevel.Expert ? 'expert-' : ''
    return <div className={styles.navigation}>
        <NavLink
            to={`/${expert}`}
            className={({ isActive, isPending }) => isActive ? styles.active : ''}
        >
            <div className={styles.navButton}>Stake Auction Marketplace</div>
        </NavLink>
        <NavLink
            to={`/${expert}protected-events`}
            className={({ isActive, isPending }) => isActive ? styles.active : ''}
        >
            <div className={styles.navButton}>Protected Events</div>
        </NavLink>
        <NavLink
            to={`/${expert}bonds`}
            className={({ isActive, isPending }) => isActive ? styles.active : ''}
        >
            <div className={styles.navButton}>Validator Bonds</div>
        </NavLink>
    </div>
};

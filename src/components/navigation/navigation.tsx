import React, { useEffect, useMemo, useState } from "react";
import styles from './navigation.module.css'
import { NavLink } from "react-router-dom";

export const Navigation: React.FC = () => {
    return <div className={styles.navigation}>
        <NavLink
            to={`/protected-events`}
            className={({ isActive, isPending }) => isActive ? styles.active : ''}
        >
            <div className={styles.navButton}>Protected Events</div>
        </NavLink>
        <NavLink
            to={`/`}
            className={({ isActive, isPending }) => isActive ? styles.active : ''}
        >

            <div className={styles.navButton}>Validator Bonds</div>
        </NavLink>
    </div>
};

import React from 'react'
import { NavLink } from 'react-router-dom'

import { cn } from 'src/lib/utils'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const tab =
  'h-10 leading-[30px] px-5 py-[5px] bg-slate-950 text-slate-300 m-[4px_0_4px_4px] cursor-pointer rounded border-none text-[length:inherit] no-underline inline-block hover:bg-slate-800 hover:text-slate-200 transition-colors'
const tabActive = 'bg-slate-700 text-slate-100'

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const isExpert = level === UserLevel.Expert
  const prefix = isExpert ? 'expert-' : ''
  return (
    <div className="navigation flex items-center bg-slate-900 [&_a]:no-underline">
      <NavLink to={`/${prefix}`}>
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>
            Stake Auction Marketplace
          </div>
        )}
      </NavLink>
      <NavLink to={`/${prefix}protected-events`}>
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>Protected Events</div>
        )}
      </NavLink>
      <NavLink to={`/${prefix}bonds`}>
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>Validator Bonds</div>
        )}
      </NavLink>
      <a
        href="/docs/"
        className={cn(
          tab,
          'docsButton ml-auto bg-slate-700/50 hover:bg-slate-700 hover:text-slate-100',
        )}
      >
        Docs
      </a>
      {isExpert && (
        <a
          href="/docs/?from=expert#GUIDE-EXPERT"
          className={cn(
            tab,
            'bg-slate-700/50 hover:bg-slate-700 hover:text-slate-100',
          )}
        >
          Expert Guide
        </a>
      )}
      {children}
    </div>
  )
}

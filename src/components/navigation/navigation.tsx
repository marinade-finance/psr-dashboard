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
  'h-10 leading-[30px] px-5 py-[5px] bg-[--bg-dark-2] text-[--text-light-1] m-[4px_0_4px_4px] cursor-pointer rounded border-none text-[length:inherit] no-underline inline-block hover:bg-[--bg-dark-3] transition-colors'
const tabActive = 'bg-[--bg-dark-4] text-[--text-light-2]'

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const isExpert = level === UserLevel.Expert
  const prefix = isExpert ? 'expert-' : ''
  return (
    <div className="navigation flex items-center bg-[--bg-dark-1] [&_a]:no-underline">
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
          'docsButton ml-auto bg-[--bg-dark-3] hover:bg-[--bg-dark-4] hover:text-[--text-light-2]',
        )}
      >
        Docs
      </a>
      {isExpert && (
        <a
          href="/docs/?from=expert#GUIDE-EXPERT"
          className={cn(
            tab,
            'bg-[--bg-dark-3] hover:bg-[--bg-dark-4] hover:text-[--text-light-2]',
          )}
        >
          Expert Guide
        </a>
      )}
      {children}
    </div>
  )
}

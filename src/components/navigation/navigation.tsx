import React from 'react'
import { NavLink } from 'react-router-dom'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const NAV_BUTTON_CLASS =
  'h-11 leading-[44px] px-4 bg-transparent text-[var(--muted-foreground)] cursor-pointer rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 border-b-2 border-transparent -mb-px hover:text-[var(--foreground)] hover:bg-[var(--primary-light-05)]'

const ACTIVE_CLASS =
  '[&>div]:text-[var(--primary)] [&>div]:border-b-[var(--primary)]'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? ACTIVE_CLASS : ''

export const Navigation: React.FC<UserLevelProps> = ({ level }) => {
  const expert = level === UserLevel.Expert ? 'expert-' : ''
  return (
    <div className="flex items-center bg-[var(--card)] border-b border-[var(--border)] px-6 gap-1">
      <NavLink to={`/${expert}`} className={navLinkClass}>
        <div className={NAV_BUTTON_CLASS}>Stake Auction Marketplace</div>
      </NavLink>
      <NavLink to={`/${expert}protected-events`} className={navLinkClass}>
        <div className={NAV_BUTTON_CLASS}>Protected Events</div>
      </NavLink>
      <NavLink to={`/${expert}bonds`} className={navLinkClass}>
        <div className={NAV_BUTTON_CLASS}>Validator Bonds</div>
      </NavLink>
      <a href="docs/" className="ml-auto no-underline">
        <div className={NAV_BUTTON_CLASS}>Docs</div>
      </a>
    </div>
  )
}

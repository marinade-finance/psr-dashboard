import React from 'react'
import { Link, NavLink } from 'react-router-dom'

import { cn } from 'src/class_utils'
import { EpochMeter } from 'src/components/epoch-meter/epoch-meter'
import { MarinadeLogo } from 'src/components/icons/marinade-logo'
import { ThemeToggle } from 'src/components/theme-toggle/theme-toggle'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const tab =
  'px-3.5 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer border-none no-underline inline-block whitespace-nowrap'
const tabActive =
  'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const isExpert = level === UserLevel.Expert
  const prefix = isExpert ? 'expert-' : ''

  return (
    <>
      <div
        role="alert"
        data-mobile-unsupported
        className="sm:hidden bg-warning-light text-warning text-xs px-3 py-2 text-center border-b border-warning/30"
      >
        Mobile view is not supported. Open the dashboard on a screen at least
        640px wide.
      </div>
      <div className="navigation flex items-center h-14 bg-card border-b border-border shadow-card [&_a]:no-underline overflow-x-auto">
        <Link
          to={`/${prefix}`}
          className="flex items-center gap-2.5 mx-3 hover:opacity-80 transition-opacity shrink-0"
        >
          <MarinadeLogo />
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold text-foreground leading-tight">
              PSR Dashboard
            </span>
            <span className="text-2xs text-muted-foreground leading-tight">
              Protected Stake Rewards
            </span>
          </div>
        </Link>
        <div className="w-px h-6 bg-border mr-2 hidden sm:block shrink-0" />
        <div className="flex items-center gap-1 shrink-0">
          <NavLink to={`/${prefix}`}>
            {({ isActive }) => (
              <div className={cn(tab, isActive && tabActive)}>
                <span className="hidden sm:inline">
                  Stake Auction Marketplace
                </span>
                <span className="sm:hidden">SAM</span>
              </div>
            )}
          </NavLink>
          <NavLink to={`/${prefix}protected-events`}>
            {({ isActive }) => (
              <div className={cn(tab, isActive && tabActive)}>
                <span className="hidden sm:inline">Protected Events</span>
                <span className="sm:hidden">Events</span>
              </div>
            )}
          </NavLink>
          <NavLink to={`/${prefix}bonds`}>
            {({ isActive }) => (
              <div className={cn(tab, isActive && tabActive)}>
                <span className="hidden sm:inline">Validator Bonds</span>
                <span className="sm:hidden">Bonds</span>
              </div>
            )}
          </NavLink>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <a
            href={isExpert ? '/expert-docs' : '/docs'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              tab,
              'docsButton hidden sm:flex items-center gap-1.5 border border-transparent hover:border-border',
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="opacity-60"
            >
              <path
                d="M2.5 2C2.5 1.72386 2.72386 1.5 3 1.5H8L11.5 5V12C11.5 12.2761 11.2761 12.5 11 12.5H3C2.72386 12.5 2.5 12.2761 2.5 12V2Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M5 7.5H9"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M5 9.5H8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Docs
          </a>
          <EpochMeter />
          {children}
          <ThemeToggle />
        </div>
      </div>
    </>
  )
}

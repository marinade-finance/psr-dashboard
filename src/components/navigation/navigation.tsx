import React, { useCallback } from 'react'
import { useQueryClient } from 'react-query'
import { NavLink } from 'react-router-dom'

import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

// Marinade teal droplet icon
const MarinadeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="6" fill="var(--primary)" />
    <path
      d="M10 4.5C10 4.5 5.5 9 5.5 11.5C5.5 14 7.5 15.5 10 15.5C12.5 15.5 14.5 14 14.5 11.5C14.5 9 10 4.5 10 4.5Z"
      fill="white"
      opacity="0.9"
    />
  </svg>
)

export const Navigation: React.FC<UserLevelProps> = ({ level }) => {
  const prefix = level === UserLevel.Expert ? '/expert-' : '/'
  const queryClient = useQueryClient()

  const handleMouseEnter = useCallback(
    (to: string) => {
      const key = to.replace(/^\/(expert-)?/, '')
      if (key === 'protected-events') {
        void queryClient.prefetchQuery(
          'protected-events',
          fetchProtectedEventsWithValidator,
          {
            staleTime: 5 * 60 * 1000,
          },
        )
      } else if (key === 'bonds') {
        void queryClient.prefetchQuery('bonds', fetchValidatorsWithBonds, {
          staleTime: 5 * 60 * 1000,
        })
      }
    },
    [queryClient],
  )

  const navItems = [
    { to: prefix === '/' ? '/' : '/expert-', label: 'Stake Auction' },
    { to: `${prefix}protected-events`, label: 'Protected Events' },
    { to: `${prefix}bonds`, label: 'Validator Bonds' },
  ]

  return (
    <nav className="flex items-center bg-card border-b border-border px-6 h-14 w-full">
      {/* Brand */}
      <NavLink
        to="/"
        className="flex items-center gap-2.5 mr-8 hover:opacity-80 transition-opacity"
      >
        <MarinadeIcon />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground leading-tight">
            PSR Dashboard
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            Protected Stake Rewards
          </span>
        </div>
      </NavLink>

      {/* Divider */}
      <div className="w-px h-6 bg-border mr-4" />

      {/* Nav links */}
      <div className="flex items-center gap-0.5">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/expert-'}
            onMouseEnter={() => handleMouseEnter(to)}
            className={({ isActive }) =>
              `px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <a
          href="docs/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border"
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
      </div>
    </nav>
  )
}

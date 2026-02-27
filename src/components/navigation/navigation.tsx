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
    <nav className="flex items-center bg-card border-b-2 border-border px-6 h-14 w-full font-mono">
      {/* Brand */}
      <NavLink
        to="/"
        className="flex items-center gap-2 mr-8 hover:opacity-80 transition-opacity"
      >
        <span className="text-primary font-bold text-base tracking-tight">
          {'>'} PSR_DASHBOARD
        </span>
      </NavLink>

      {/* Divider */}
      <span className="text-border mr-4 select-none">│</span>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/expert-'}
            onMouseEnter={() => handleMouseEnter(to)}
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium transition-all border border-transparent ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:border-border'
              }`
            }
          >
            {({ isActive }) => (
              <span>{isActive ? `[* ${label} ]` : `[ ${label} ]`}</span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <a
          href="docs/"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border"
        >
          [ Docs ]
        </a>
      </div>
    </nav>
  )
}

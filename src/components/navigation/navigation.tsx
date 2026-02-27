import React, { useCallback, useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

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
    { to: `${prefix}protected-events`, label: 'Events' },
    { to: `${prefix}bonds`, label: 'Bonds' },
  ]

  return (
    <nav className="border-b border-border px-4 sm:px-6 font-mono">
      <div className="flex items-center h-12 w-full">
        {/* Brand */}
        <NavLink
          to="/"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <span className="text-foreground font-bold text-sm sm:text-base tracking-tight">
            {'>'} PSR
            <span className="hidden sm:inline">_DASHBOARD</span>
          </span>
        </NavLink>

        {/* Divider */}
        <span className="text-border mx-2 sm:mx-4 select-none hidden sm:inline">
          │
        </span>

        {/* Nav links — desktop */}
        <div className="hidden sm:flex items-center gap-0.5">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/expert-'}
              onMouseEnter={() => handleMouseEnter(to)}
              className={({ isActive }) =>
                `px-2 py-1 text-xs sm:text-sm font-mono whitespace-nowrap ${
                  isActive
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <span>{isActive ? `[* ${label} ]` : `[ ${label} ]`}</span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden ml-2 text-muted-foreground hover:text-foreground text-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          [≡]
        </button>

        {/* Right side */}
        <div className="ml-auto">
          <a
            href="docs/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            [ Docs ]
          </a>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border py-2 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/expert-'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-2 py-1.5 text-sm font-mono ${
                  isActive
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <span>{isActive ? `> ${label}` : `  ${label}`}</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

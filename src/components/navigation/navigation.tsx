import React from 'react'
import { NavLink } from 'react-router-dom'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

export const Navigation: React.FC<UserLevelProps> = ({ level }) => {
  const prefix = level === UserLevel.Expert ? '/expert-' : '/'
  
  const navItems = [
    { to: prefix === '/' ? '/' : '/expert-', label: 'Stake Auction' },
    { to: `${prefix}protected-events`, label: 'Protected Events' },
    { to: `${prefix}bonds`, label: 'Validator Bonds' },
  ]

  return (
    <nav className="flex items-center bg-card border-b border-border px-6 h-14">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-8">
        <span className="text-base font-semibold text-foreground">PSR Dashboard</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/expert-'}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side - Docs link */}
      <div className="ml-auto">
        <a
          href="docs/"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          Docs
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
            <path d="M3.5 1.5H10.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </nav>
  )
}

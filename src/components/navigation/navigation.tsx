import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useCallback } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { cn } from 'src/class_utils'
import { MarinadeLogo } from 'src/components/icons/marinade-logo'
import { ThemeToggle } from 'src/components/theme-toggle/theme-toggle'
import { loadSam } from 'src/services/sam'
import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const PROTECTED_EVENTS = 'protected-events'
const BONDS = 'bonds'

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
  const queryClient = useQueryClient()
  // Subscribe to the same ['sam', 0] query the app already prefetches; this
  // stays live with the auto-refetch so the epoch ticks when SAM reruns.
  const { data: sam } = useQuery({
    queryKey: ['sam', 0],
    queryFn: () => loadSam(null),
  })
  const epoch = sam?.auctionResult.auctionData.epoch

  const prefetch = useCallback(
    (route: string) => {
      if (route === PROTECTED_EVENTS) {
        void queryClient.prefetchQuery({
          queryKey: [PROTECTED_EVENTS],
          queryFn: fetchProtectedEventsWithValidator,
          staleTime: 5 * 60 * 1000,
        })
      } else if (route === BONDS) {
        void queryClient.prefetchQuery({
          queryKey: [BONDS],
          queryFn: fetchValidatorsWithBonds,
          staleTime: 5 * 60 * 1000,
        })
      }
    },
    [queryClient],
  )

  return (
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
          <span className="text-[10px] text-muted-foreground leading-tight">
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
        <NavLink
          to={`/${prefix}protected-events`}
          onMouseEnter={() => prefetch(PROTECTED_EVENTS)}
        >
          {({ isActive }) => (
            <div className={cn(tab, isActive && tabActive)}>
              <span className="hidden sm:inline">Protected Events</span>
              <span className="sm:hidden">Events</span>
            </div>
          )}
        </NavLink>
        <NavLink to={`/${prefix}bonds`} onMouseEnter={() => prefetch(BONDS)}>
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
        {epoch !== undefined && (
          <span className="text-xs font-mono text-muted-foreground px-2 py-1 rounded-md bg-muted whitespace-nowrap">
            Epoch {epoch}
          </span>
        )}
        {children}
        <ThemeToggle />
      </div>
    </div>
  )
}

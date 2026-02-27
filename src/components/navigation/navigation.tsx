import React, { useCallback } from 'react'
import { useQueryClient } from 'react-query'
import { NavLink } from 'react-router-dom'

import { ThemeToggle } from 'src/components/theme-toggle/theme-toggle'
import { cn } from 'src/lib/utils'
import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

export enum UserLevel {
  Basic = 'basic',
  Expert = 'expert',
}

export type UserLevelProps = {
  level?: UserLevel
}

const MarinadeLogo = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 50 33"
    fill="none"
    className="text-primary shrink-0"
  >
    <path
      d="M48.3725 8.61901C48.3725 3.83832 44.3211 0.5 38.5216 0.5C33.8062 0.5 30.5561 2.83765 26.7923 5.54478C26.1627 5.99715 25.5117 6.4661 24.8406 6.93269C22.9043 8.27796 20.8922 9.59007 19.0564 10.7494C18.873 10.8655 18.6446 10.8809 18.4481 10.7909C16.9875 10.1242 14.0949 9.05599 10.5382 9.05599C2.64139 9.05599 0.984375 13.4104 0.984375 17.0637C0.984375 19.965 2.72069 22.3808 6.00393 24.0494C7.01353 24.5622 8.01839 24.9269 8.83742 25.1756C9.47419 25.3698 9.97957 25.8542 10.1938 26.4842C10.408 27.1142 10.6613 27.7892 10.975 28.4831C11.3218 29.2505 11.736 30.0925 12.2035 30.9866C12.7042 31.941 13.6948 32.5 14.7186 32.5C15.0879 32.5 15.4619 32.4278 15.8182 32.275C21.0662 30.0285 29.2932 27.2302 38.6885 26.6547C40.3206 26.554 41.5586 25.1934 41.5078 23.5556C41.4841 22.7894 41.445 22.0753 41.3929 21.4346C41.3539 20.9539 41.3018 20.479 41.2474 20.0408C41.1444 19.2095 41.4734 18.3841 42.122 17.8548C42.7706 17.3254 43.5151 16.6812 44.2726 15.9375C46.9936 13.2671 48.3737 10.8051 48.3737 8.61901H48.3725Z"
      fill="currentColor"
    />
  </svg>
)

const PROTECTED_EVENTS = 'protected-events'
const BONDS = 'bonds'

const tab =
  'h-10 leading-[30px] px-5 py-[5px] bg-background-page text-foreground m-[4px_0_4px_4px] cursor-pointer rounded-lg border-none text-[length:inherit] no-underline inline-block hover:bg-secondary hover:text-card-foreground transition-colors duration-150 border-b-2 border-b-transparent whitespace-nowrap'
const tabActive = 'bg-tertiary text-card-foreground border-b-2 border-b-primary'

export const Navigation: React.FC<React.PropsWithChildren<UserLevelProps>> = ({
  level,
  children,
}) => {
  const isExpert = level === UserLevel.Expert
  const prefix = isExpert ? 'expert-' : ''
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    (route: string) => {
      if (route === PROTECTED_EVENTS) {
        void queryClient.prefetchQuery(
          PROTECTED_EVENTS,
          fetchProtectedEventsWithValidator,
          { staleTime: 5 * 60 * 1000 },
        )
      } else if (route === BONDS) {
        void queryClient.prefetchQuery(BONDS, fetchValidatorsWithBonds, {
          staleTime: 5 * 60 * 1000,
        })
      }
    },
    [queryClient],
  )

  return (
    <div className="navigation flex items-center h-12 bg-card/80 backdrop-blur-md border-b border-border-grid shadow-card [&_a]:no-underline">
      <NavLink
        to="/"
        className="flex items-center gap-2 mx-3 hover:opacity-80 transition-opacity shrink-0"
      >
        <MarinadeLogo />
        <span className="text-sm font-semibold text-foreground leading-tight hidden sm:block">
          PSR Dashboard
        </span>
      </NavLink>
      <div className="w-px h-6 bg-border-grid mr-1 hidden sm:block" />
      <NavLink to={`/${prefix}`}>
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>
            Stake Auction Marketplace
          </div>
        )}
      </NavLink>
      <NavLink
        to={`/${prefix}protected-events`}
        onMouseEnter={() => prefetch(PROTECTED_EVENTS)}
      >
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>Protected Events</div>
        )}
      </NavLink>
      <NavLink to={`/${prefix}bonds`} onMouseEnter={() => prefetch(BONDS)}>
        {({ isActive }) => (
          <div className={cn(tab, isActive && tabActive)}>Validator Bonds</div>
        )}
      </NavLink>
      <a
        href="/docs/"
        className={cn(
          tab,
          'docsButton ml-auto bg-secondary hover:bg-tertiary hover:text-card-foreground',
        )}
      >
        Docs
      </a>
      {isExpert && (
        <a
          href="/docs/?from=expert#GUIDE-EXPERT"
          className={cn(
            tab,
            'bg-secondary hover:bg-tertiary hover:text-card-foreground',
          )}
        >
          Expert Guide
        </a>
      )}
      {children}
      <ThemeToggle />
    </div>
  )
}

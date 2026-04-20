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
    width="28"
    height="28"
    viewBox="0 0 50 33"
    fill="none"
    className="text-primary shrink-0"
  >
    <path
      d="M48.3725 8.61901C48.3725 3.83832 44.3211 0.5 38.5216 0.5C33.8062 0.5 30.5561 2.83765 26.7923 5.54478C26.1627 5.99715 25.5117 6.4661 24.8406 6.93269C22.9043 8.27796 20.8922 9.59007 19.0564 10.7494C18.873 10.8655 18.6446 10.8809 18.4481 10.7909C16.9875 10.1242 14.0949 9.05599 10.5382 9.05599C2.64139 9.05599 0.984375 13.4104 0.984375 17.0637C0.984375 19.965 2.72069 22.3808 6.00393 24.0494C7.01353 24.5622 8.01839 24.9269 8.83742 25.1756C9.47419 25.3698 9.97957 25.8542 10.1938 26.4842C10.408 27.1142 10.6613 27.7892 10.975 28.4831C11.3218 29.2505 11.736 30.0925 12.2035 30.9866C12.7042 31.941 13.6948 32.5 14.7186 32.5C15.0879 32.5 15.4619 32.4278 15.8182 32.275C21.0662 30.0285 29.2932 27.2302 38.6885 26.6547C40.3206 26.554 41.5586 25.1934 41.5078 23.5556C41.4841 22.7894 41.445 22.0753 41.3929 21.4346C41.3539 20.9539 41.3018 20.479 41.2474 20.0408C41.1444 19.2095 41.4734 18.3841 42.122 17.8548C42.7706 17.3254 43.5151 16.6812 44.2726 15.9375C46.9936 13.2671 48.3737 10.8051 48.3737 8.61901H48.3725ZM16.0573 29.3571C15.8052 29.4577 15.5353 29.5158 15.2643 29.4956C14.605 29.4459 14.0049 29.035 13.7351 28.3979C13.5919 28.0592 13.4569 27.7323 13.3161 27.4232C13.019 26.766 12.7716 26.0922 12.5823 25.5214C12.4 24.9707 12.6474 24.3691 13.167 24.1134C14.3269 23.5414 16.2135 22.8474 18.0386 22.3643C18.2149 22.3181 18.3688 22.2032 18.4505 22.041C19.1192 20.7194 18.0457 19.6867 17.0254 19.971C16.9603 19.9887 15.4075 20.4198 13.7895 21.0427C12.8296 21.4121 12.0591 21.7615 11.4531 22.1097C10.569 22.6177 9.51088 22.7243 8.55573 22.3654C6.36256 21.5412 3.55392 19.9259 3.55392 17.0661C3.55392 14.5366 4.34692 11.634 10.5335 11.634C12.0627 11.634 13.4581 11.8685 14.6263 12.1729C15.1885 12.3197 15.295 13.0729 14.7956 13.3725C13.2084 14.3258 12.1858 14.912 12.1597 14.9274C11.5431 15.2803 11.3289 16.0678 11.6816 16.6847C12.0343 17.3017 12.8213 17.5161 13.438 17.1632C13.4794 17.1395 16.0655 15.6557 19.4589 13.5371C19.4766 13.5264 19.4944 13.5146 19.5121 13.5039C21.6082 12.1954 24.0062 10.6464 26.3023 9.05244C26.9912 8.57401 27.6516 8.09914 28.2895 7.64085C31.832 5.09359 34.63 3.08042 38.5168 3.08042C42.8701 3.08042 45.7947 5.30794 45.7947 8.62375C45.7947 11.0301 42.5978 14.1505 40.3845 15.9493C39.7785 16.442 38.995 16.6528 38.2198 16.5533C37.9973 16.5249 37.7736 16.5 37.5499 16.4787C37.0776 16.4349 36.8054 15.9209 37.0338 15.5041C38.1393 13.4944 38.6033 12.2569 38.6293 12.1871C38.8755 11.5204 38.537 10.7814 37.8706 10.5339C37.2054 10.2852 36.4645 10.6251 36.216 11.2906C36.2089 11.3107 35.4833 13.2268 33.6665 16.1649C33.5565 16.3425 33.3671 16.4574 33.1576 16.4739C32.7067 16.5095 32.3599 16.0843 32.4806 15.6497C32.7978 14.5093 32.8522 13.9871 32.8593 13.903C32.9197 13.1948 32.3966 12.5625 31.6876 12.5021C30.9763 12.4429 30.3561 12.958 30.2957 13.6673C30.2957 13.6768 30.1951 14.5235 29.4838 16.6149C29.4068 16.8422 29.2115 17.0128 28.976 17.0601C27.3178 17.387 26.2088 17.7174 26.0916 17.7529C25.4111 17.959 25.0264 18.6766 25.2324 19.3575C25.4371 20.0373 26.1544 20.4245 26.8361 20.2185C26.8669 20.209 28.1866 19.8182 30.1052 19.4748L30.1643 19.4665C30.2768 19.457 30.8591 19.3481 30.8851 19.3433C32.7232 19.0555 34.9649 18.8495 37.1297 19.0283C37.9475 19.0958 38.6092 19.7223 38.7074 20.537C38.75 20.8946 38.7891 21.2712 38.821 21.6502C38.8494 21.996 38.8731 22.3654 38.8932 22.7551C38.9133 23.1447 38.8056 23.9973 37.9262 24.0387C37.1486 24.0755 33.7447 24.0932 26.932 25.7263C21.7337 26.9721 17.0976 28.945 16.0537 29.363L16.0573 29.3571Z"
      fill="currentColor"
    />
  </svg>
)

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
    <div className="navigation flex items-center h-14 bg-card border-b border-border shadow-card [&_a]:no-underline overflow-x-auto">
      <NavLink
        to="/"
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
      </NavLink>
      <div className="w-px h-6 bg-border mr-2 hidden sm:block shrink-0" />
      <div className="flex items-center gap-0.5 shrink-0">
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
          href="/docs/"
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
        {isExpert && (
          <a
            href="/docs/?from=expert#GUIDE-EXPERT"
            className={cn(
              tab,
              'hidden sm:inline border border-transparent hover:border-border',
            )}
          >
            Expert Guide
          </a>
        )}
        {children}
        <ThemeToggle />
      </div>
    </div>
  )
}

import React from 'react'

import { Navigation } from 'src/components/navigation/navigation'

import type { UserLevel } from 'src/components/navigation/navigation'

interface PageLayoutProps {
  level?: UserLevel
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  level,
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <div className="min-h-screen font-mono">
      <Navigation level={level} />
      <div className="relative max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-bold text-foreground uppercase">
              {'>> '}
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {':: '}
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

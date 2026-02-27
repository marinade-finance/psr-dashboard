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
    <div className="min-h-screen bg-background-page font-mono">
      <Navigation level={level} />
      <div className="relative max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold text-foreground font-mono">
              {'>> '}
              {title.toUpperCase()}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-muted-foreground font-mono">
                {':: '}
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2.5">{actions}</div>
          )}
        </div>
        <div className="border-t border-border mx-6 mb-4" />
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

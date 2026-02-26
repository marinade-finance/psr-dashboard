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
    <div className="min-h-screen bg-background-page">
      <div className="relative max-w-[1600px] mx-auto">
        <Navigation level={level} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold text-foreground font-sans">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-muted-foreground font-sans">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2.5">{actions}</div>
          )}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

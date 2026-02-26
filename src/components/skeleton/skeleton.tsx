import React from 'react'

import { Skeleton } from 'src/components/ui/skeleton'

const StatCard: React.FC = () => (
  <div className="bg-card rounded-xl px-5 py-4 border border-border">
    <Skeleton className="h-3 w-20 mb-3" />
    <Skeleton className="h-5 w-28" />
  </div>
)

const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
    <Skeleton className="h-4 w-6" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-40 flex-shrink-0" />
    <Skeleton className="h-4 w-5 ml-auto" />
  </div>
)

export const SamSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* Stats bar */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>

    {/* Table */}
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-40 flex-shrink-0" />
        <Skeleton className="h-3 w-5 ml-auto" />
      </div>
      {/* Rows */}
      {Array.from({ length: 10 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  </div>
)

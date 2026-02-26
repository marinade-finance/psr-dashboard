import React from 'react'

import { Skeleton } from 'src/components/ui/skeleton'

const StatCard: React.FC = () => (
  <div className="bg-card rounded-xl px-5 py-4 border border-border shadow-xs">
    <Skeleton className="h-3 w-20 mb-3" />
    <Skeleton className="h-5 w-28" />
  </div>
)

const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border-grid">
    <Skeleton className="h-4 w-6" />
    <div className="flex flex-col gap-1">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-40 flex-shrink-0" />
    <Skeleton className="h-4 w-5 ml-auto" />
  </div>
)

export const SamSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats bar */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>

    {/* Table */}
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 bg-muted border-b border-border">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-40 flex-shrink-0" />
        <Skeleton className="h-3 w-5 ml-auto" />
      </div>
      {Array.from({ length: 12 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  </div>
)

export const BondsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 bg-muted border-b border-border">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-grid"
        >
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
)

export const EventsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-9 w-24 rounded-lg" />
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 bg-muted border-b border-border">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border-grid"
        >
          <Skeleton className="h-4 w-10" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-sm" />
          <Skeleton className="h-5 w-16 rounded-sm" />
        </div>
      ))}
    </div>
  </div>
)

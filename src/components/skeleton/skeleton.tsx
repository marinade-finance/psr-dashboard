import React from 'react'

const Pulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-muted rounded animate-pulse ${className}`} />
)

const StatCard: React.FC = () => (
  <div className="bg-card rounded-xl px-5 py-4 border border-border">
    <Pulse className="h-3 w-20 mb-3" />
    <Pulse className="h-5 w-28" />
  </div>
)

const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
    <Pulse className="h-4 w-6" />
    <Pulse className="h-4 w-24" />
    <Pulse className="h-4 w-16" />
    <Pulse className="h-4 w-20" />
    <Pulse className="h-4 w-16" />
    <Pulse className="h-4 w-40 flex-shrink-0" />
    <Pulse className="h-4 w-5 ml-auto" />
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
        <Pulse className="h-3 w-6" />
        <Pulse className="h-3 w-24" />
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-20" />
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-40 flex-shrink-0" />
        <Pulse className="h-3 w-5 ml-auto" />
      </div>
      {/* Rows */}
      {Array.from({ length: 10 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  </div>
)

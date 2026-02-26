import React from 'react'

export const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-12 text-[var(--primary)] text-sm font-mono">
      <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin mr-3" />
      Loading...
    </div>
  )
}

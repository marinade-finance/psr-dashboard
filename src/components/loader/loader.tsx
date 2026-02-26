import React from 'react'

export const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-12 text-primary text-sm font-mono">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-3" />
      Loading...
    </div>
  )
}

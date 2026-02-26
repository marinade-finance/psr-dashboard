import React from 'react'

export const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

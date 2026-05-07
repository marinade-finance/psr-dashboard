import React from 'react'

type Props = {
  name: string | null | undefined
  voteAccount: string
  /** Show full vote account on `sm+`, truncated on mobile. Otherwise always truncate. */
  responsive?: boolean
  trailing?: React.ReactNode
}

const truncate = (va: string) => `${va.slice(0, 8)}…${va.slice(-4)}`

export const ValidatorIdentity: React.FC<Props> = ({
  name,
  voteAccount,
  responsive,
  trailing,
}) => (
  <div className="flex items-center gap-1.5">
    <div className="min-w-0">
      <div className="font-medium text-sm text-foreground truncate">
        {name || '---'}
      </div>
      {responsive ? (
        <>
          <div className="text-xs font-mono text-secondary-foreground mt-px hidden sm:block">
            {voteAccount}
          </div>
          <div className="text-xs font-mono text-secondary-foreground mt-px sm:hidden">
            {truncate(voteAccount)}
          </div>
        </>
      ) : (
        <div className="text-xs font-mono text-secondary-foreground mt-px">
          {truncate(voteAccount)}
        </div>
      )}
    </div>
    {trailing}
  </div>
)

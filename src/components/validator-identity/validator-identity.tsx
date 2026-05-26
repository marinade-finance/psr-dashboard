import React from 'react'

type Props = {
  name: string | null | undefined
  voteAccount: string
  /** Show full vote account on `sm+`, truncated on mobile. Otherwise always truncate. */
  responsive?: boolean
  /** Hide the vote account sub-line (compact display). */
  compact?: boolean
  trailing?: React.ReactNode
}

const truncate4 = (va: string) => `${va.slice(0, 4)}…${va.slice(-4)}`
const truncate8 = (va: string) => `${va.slice(0, 8)}…${va.slice(-8)}`

export const ValidatorIdentity: React.FC<Props> = ({
  name,
  voteAccount,
  responsive,
  compact,
  trailing,
}) => (
  <div className="flex items-center gap-1.5">
    <div className="min-w-0">
      <div className="font-medium text-base text-foreground truncate">
        {name || '---'}
      </div>
      {!compact && (responsive ? (
        <>
          <div className="text-xs font-mono text-secondary-foreground mt-px hidden sm:block">
            {truncate8(voteAccount)}
          </div>
          <div className="text-xs font-mono text-secondary-foreground mt-px sm:hidden">
            {truncate4(voteAccount)}
          </div>
        </>
      ) : (
        <div className="text-xs font-mono text-secondary-foreground mt-px">
          {truncate4(voteAccount)}
        </div>
      ))}
    </div>
    {trailing}
  </div>
)

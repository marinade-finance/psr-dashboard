import React from 'react'

import { pmpe, stake } from 'src/format'
import { computeNextEpochStake } from 'src/services/next-epoch-stake'

import { CalcCard } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  isSimulated?: boolean
  onGoToSim?: () => void
}

export const NextEpochStakeBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  auctionResult,
  isSimulated,
  onGoToSim,
}) => {
  const next = computeNextEpochStake(validator, auctionResult)
  const noFrontier = next.priorityFrontierPmpe <= 0

  const status: { label: string; tone: 'red' | 'yellow' | 'green' } = noFrontier
    ? {
        label:
          'The redelegation budget reaches every below-target winner this run — no priority bar is binding. This is an estimate; verify in Simulate.',
        tone: 'green',
      }
    : next.bidIncreaseForPriority > 0
      ? {
          label: `Being in the set is not the same as getting stake. Raise your bid by about ${pmpe(next.bidIncreaseForPriority)} PMPE to reach the priority bar. Estimate only — the order shifts as bids change, so verify in Simulate.`,
          tone: 'yellow',
        }
      : {
          label:
            'Your total already sits at or above the priority bar. This is an estimate — the order shifts as bids change, so verify in Simulate.',
          tone: 'green',
        }

  const tip = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      Simulate the exact bid →
    </button>
  ) : null

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
      tip={tip}
    >
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader
            title="Next-epoch stake flow"
            help="Redelegation budget is handed out greedily by total PMPE, highest first, until it runs out."
          />
          <CalcRow
            label="Expected stake change"
            secondary={
              next.expectedDeltaSol === 0
                ? '—'
                : `${next.expectedDeltaSol > 0 ? '+' : ''}${stake(next.expectedDeltaSol)}`
            }
          />
          <CalcRow
            label="Redelegation inflow"
            secondary={stake(next.redelegationInflowSol)}
          />
          <CalcRow
            label="Redelegation budget this run"
            secondary={stake(next.redelegationBudgetSol)}
          />

          <SectionHeader
            title="Bid to reach the priority bar"
            help="Heuristic. Raising your bid reorders the queue and moves the bar itself, so this is an estimate — confirm in Simulate."
          />
          {noFrontier ? (
            <OkRow message="No binding priority bar this run." />
          ) : (
            <>
              <CalcRow
                label="Priority bar total PMPE"
                secondary={pmpe(next.priorityFrontierPmpe)}
              />
              <CalcRow
                label="Your current total PMPE"
                secondary={pmpe(next.currentTotalPmpe)}
              />
              <CalcRow
                label="Target total PMPE"
                value={pmpe(next.targetTotalPmpePriority)}
                bold
              />
              <CalcRow
                label="Target static bid PMPE"
                value={pmpe(next.targetBidPmpePriority)}
                bold
              />
              {next.bidIncreaseForPriority > 0 ? (
                <CalcRow
                  label="Bid increase for priority"
                  value={pmpe(next.bidIncreaseForPriority)}
                  total
                  severity="warning"
                />
              ) : (
                <OkRow message="You already clear the priority bar." />
              )}
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

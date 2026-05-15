import React from 'react'

import { cost, pmpe, topUp } from 'src/format'
import { computeInAuctionTarget } from 'src/services/in-auction-target'

import { CalcCard } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type { BondCoverage } from 'src/services/bond-coverage'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  winningTotalPmpe: number
  coverage: BondCoverage
  isSimulated?: boolean
  onGoToSim?: () => void
}

export const InAuctionBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  winningTotalPmpe,
  coverage,
  isSimulated,
  onGoToSim,
}) => {
  const target = computeInAuctionTarget(validator, winningTotalPmpe, coverage)

  const status = ((): {
    label: string
    tone: 'red' | 'yellow' | 'green'
  } => {
    if (target.inSet) {
      return {
        label:
          'Your total already clears the winning bar. Keep the bond topped up so you stay in.',
        tone: 'green',
      }
    }
    if (target.capConstrained) {
      return {
        label: `A concentration cap is the binding limit right now, not your bid. Raising the bid alone will not get you in while ${target.capConstraintName ?? 'the cap'} is full.`,
        tone: 'red',
      }
    }
    if (target.bidIncrease <= 0) {
      return {
        label:
          'Your bid already clears the winning bar, yet you are out of the set — something other than the bid is the blocker. Check the exact reason in Simulate.',
        tone: 'yellow',
      }
    }
    return {
      label: `Raise your bid by about ${pmpe(target.bidIncrease)} PMPE to clear the winning bar. This is approximate — verify the exact figure in Simulate.`,
      tone: 'yellow',
    }
  })()

  const tip = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      Simulate the exact bid and bond →
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
            title="Bid to clear the winning bar"
            help="Closed-form estimate. Adding or growing this winner shifts the clearing price, so treat it as a floor and confirm in Simulate."
          />
          <CalcRow
            label="Winning total PMPE"
            secondary={pmpe(target.winningTotalPmpe)}
          />
          <CalcRow
            label="Inflation PMPE"
            secondary={pmpe(target.inflationPmpe)}
          />
          <CalcRow label="MEV PMPE" secondary={pmpe(target.mevPmpe)} />
          <CalcRow
            label="Block rewards PMPE"
            secondary={pmpe(target.blockPmpe)}
          />
          <CalcRow
            label="Non-bid revenue PMPE"
            value={pmpe(target.nonBidPmpe)}
            bold
          />
          <CalcRow
            label="Current static bid PMPE"
            secondary={pmpe(target.currentBidPmpe)}
          />
          <CalcRow
            label="Target static bid PMPE"
            value={pmpe(target.targetBidPmpe)}
            bold
          />
          {target.bidIncrease > 0 ? (
            <CalcRow
              label="Bid increase needed"
              value={pmpe(target.bidIncrease)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Your bid already clears the winning bar." />
          )}

          <SectionHeader
            title="Bond to back the stake"
            help="The bond figures match the Bond tab exactly — the same keep-stake floor and top-up."
          />
          <CalcRow
            label="Minimum bond required"
            value={cost(target.bondFloorToBack)}
            bold
          />
          {target.bondTopUp > 0 ? (
            <CalcRow
              label="Bond top-up to keep stake"
              value={topUp(target.bondTopUp)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond covers the stake." />
          )}

          {target.capConstrained && (
            <>
              <SectionHeader title="Cap constraint" />
              <CalcRow
                label={`Binding cap — ${target.capConstraintName ?? 'concentration'} is full`}
                value="blocked"
                total
                severity="error"
              />
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

import React from 'react'

import { cost, pmpe, stake, topUp } from 'src/format'
import { computeBidPenalty } from 'src/services/bid-penalty'
import { computeBidding } from 'src/services/bidding'
import { computeInAuctionTarget } from 'src/services/in-auction-target'
import { computeNextEpochStake } from 'src/services/next-epoch-stake'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { BondCoverage } from 'src/services/bond-coverage'
import type { ProtectedEvent } from 'src/services/protected-events'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  coverage: BondCoverage
  bondRiskFeeSol: number
  blacklistPenaltySol: number
  bidTooLowPenaltySol: number
  psrEstimates: ProtectedEvent[]
  isSimulated?: boolean
  onGoToSim?: () => void
  onGoToPenalty?: () => void
}

// One Payments breakdown: every SOL outflow this epoch plus the two
// advisory "what bid gets me in / gets me stake" estimates, in a single
// continuous table. The math comes verbatim from the existing selectors —
// this component only arranges the rows into one narrative.
export const PaymentsBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  auctionResult,
  dsSamConfig,
  winningTotalPmpe,
  coverage,
  bondRiskFeeSol,
  blacklistPenaltySol,
  bidTooLowPenaltySol,
  psrEstimates,
  isSimulated,
  onGoToSim,
  onGoToPenalty,
}) => {
  const m = computeBidding(validator)
  const penaltyMetrics = computeBidPenalty(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )
  const inAuction = computeInAuctionTarget(
    validator,
    winningTotalPmpe,
    coverage,
  )
  const nextEpoch = computeNextEpochStake(validator, auctionResult)
  const noFrontier = nextEpoch.priorityFrontierPmpe <= 0

  const psrTotal = psrEstimates.reduce(
    (sum, estimate) => sum + selectAmount(estimate),
    0,
  )
  const penaltyTotal =
    bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol + psrTotal
  const total = m.total + penaltyTotal
  const hasPenalty = penaltyTotal > 0

  const status: { label: string; tone: 'red' | 'green' | 'yellow' } = {
    label: hasPenalty
      ? `You will pay ${cost(total)} in total this epoch — including ${cost(penaltyTotal)} in penalties.`
      : `You will pay ${cost(total)} in total this epoch — no penalties.`,
    tone: hasPenalty ? 'red' : 'green',
  }

  const deltaSeverity = m.delta > 0 ? 'ok' : m.delta < 0 ? 'error' : undefined
  const deltaText =
    m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${stake(m.delta)}`

  const tip = (
    <div className="flex flex-col gap-2">
      {penaltyMetrics.penaltySol > 0 && onGoToPenalty && (
        <button
          className="text-xs text-destructive hover:underline text-left"
          onClick={onGoToPenalty}
        >
          See bid-too-low penalty calculation →
        </button>
      )}
      {onGoToSim && (
        <button
          className="text-xs text-primary hover:underline text-left"
          onClick={onGoToSim}
        >
          Simulate commission or bid changes →
        </button>
      )}
    </div>
  )

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
      tip={tip}
    >
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader title="Stake" />
          <CalcRow label="Active Marinade stake" value={stake(m.active)} bold />
          <CalcRow label="Target Marinade stake" value={stake(m.target)} />
          <CalcRow
            label="Expected change next epoch"
            value={deltaText}
            severity={deltaSeverity}
          />

          <SectionHeader title="Active stake cost PMPE" />
          <CalcRow
            label="Inflation"
            secondary={m.inflPct}
            value={pmpe(m.inflPmpe)}
          />
          <CalcRow label="MEV" secondary={m.mevPct} value={pmpe(m.mevPmpe)} />
          <CalcRow
            label="Block rewards"
            secondary={m.blkPct}
            value={pmpe(m.blkPmpe)}
          />
          <CalcRow label="Static bid PMPE" value={pmpe(m.bid)} />
          <CalcRow
            label="Total"
            value={pmpe(m.inflPmpe + m.mevPmpe + m.blkPmpe + m.bid)}
            bold
          />

          <SectionHeader title="Bid gap" />
          <CalcRow label="Static bid PMPE" value={pmpe(m.bid)} />
          <CalcRow label="Auction effective bid PMPE" value={pmpe(m.effBid)} />
          <CalcRow label="Resulting bid gap" value={pmpe(m.bidGap)} bold />

          <SectionHeader title="Cost" />
          <CalcRow label="Active stake cost" value={cost(m.cost)} />
          <CalcRow
            label="Activating stake cost"
            secondary={pmpe(m.activatingStakePmpe)}
            value={cost(m.activatingCost)}
          />

          <SectionHeader title="Penalties" />
          <CalcRow
            label="Bid-too-low penalty"
            value={bidTooLowPenaltySol > 0 ? cost(bidTooLowPenaltySol) : '—'}
          />
          <CalcRow
            label="Blacklist penalty"
            value={blacklistPenaltySol > 0 ? cost(blacklistPenaltySol) : '—'}
          />
          <CalcRow
            label="Bond risk fee"
            value={bondRiskFeeSol > 0 ? cost(bondRiskFeeSol) : '—'}
          />
          {psrEstimates.length > 0 && (
            <>
              <SectionHeader title="PSR settlements — estimated" />
              {psrEstimates.map((estimate, i) => {
                const label = isProtectedEvent(estimate.reason)
                  ? selectProtectedStakeReason(estimate)
                  : estimate.reason
                return (
                  <CalcRow
                    key={i}
                    label={String(label)}
                    secondary={
                      estimate.meta.funder === 'ValidatorBond'
                        ? 'from bond'
                        : 'from Marinade'
                    }
                    value={cost(selectAmount(estimate))}
                  />
                )
              })}
            </>
          )}
          <CalcRow label="Total per epoch" value={cost(total)} total />

          <SectionHeader
            title="Get into the auction"
            help="Closed-form estimate. Adding or growing this winner shifts the clearing price, so treat it as a floor and confirm in Simulate."
          />
          <CalcRow
            label="Winning total PMPE"
            secondary={pmpe(inAuction.winningTotalPmpe)}
          />
          <CalcRow
            label="Non-bid revenue PMPE"
            value={pmpe(inAuction.nonBidPmpe)}
            bold
          />
          <CalcRow
            label="Current static bid PMPE"
            secondary={pmpe(inAuction.currentBidPmpe)}
          />
          <CalcRow
            label="Target static bid PMPE"
            value={pmpe(inAuction.targetBidPmpe)}
            bold
          />
          {inAuction.bidIncrease > 0 ? (
            <CalcRow
              label="Bid increase needed"
              value={pmpe(inAuction.bidIncrease)}
              severity="warning"
              bold
            />
          ) : (
            <OkRow message="Your bid already clears the winning bar." />
          )}
          <CalcRow
            label="Minimum bond required"
            value={cost(inAuction.bondFloorToBack)}
            bold
          />
          {inAuction.bondTopUp > 0 ? (
            <CalcRow
              label="Bond top-up to keep stake"
              value={topUp(inAuction.bondTopUp)}
              severity="warning"
              bold
            />
          ) : (
            <OkRow message="Bond covers the stake." />
          )}
          {inAuction.capConstrained && (
            <CalcRow
              label={`Binding cap — ${inAuction.capConstraintName ?? 'concentration'} is full`}
              value="blocked"
              severity="error"
              bold
            />
          )}

          <SectionHeader
            title="Get stake next epoch"
            help="Being in the set is not the same as getting stake. Redelegation budget is handed out greedily by total PMPE, highest first, until it runs out — this estimate moves as bids change, so confirm in Simulate."
          />
          <CalcRow
            label="Expected stake change"
            secondary={
              nextEpoch.expectedDeltaSol === 0
                ? '—'
                : `${nextEpoch.expectedDeltaSol > 0 ? '+' : ''}${stake(nextEpoch.expectedDeltaSol)}`
            }
          />
          <CalcRow
            label="Redelegation inflow"
            secondary={stake(nextEpoch.redelegationInflowSol)}
          />
          <CalcRow
            label="Redelegation budget this run"
            secondary={stake(nextEpoch.redelegationBudgetSol)}
          />
          {noFrontier ? (
            <OkRow message="No binding priority bar this run." />
          ) : (
            <>
              <CalcRow
                label="Priority bar total PMPE"
                secondary={pmpe(nextEpoch.priorityFrontierPmpe)}
              />
              <CalcRow
                label="Your current total PMPE"
                secondary={pmpe(nextEpoch.currentTotalPmpe)}
              />
              <CalcRow
                label="Target total PMPE"
                value={pmpe(nextEpoch.targetTotalPmpePriority)}
                bold
              />
              <CalcRow
                label="Target static bid PMPE"
                value={pmpe(nextEpoch.targetBidPmpePriority)}
                bold
              />
              {nextEpoch.bidIncreaseForPriority > 0 ? (
                <CalcRow
                  label="Bid increase for priority"
                  value={pmpe(nextEpoch.bidIncreaseForPriority)}
                  severity="warning"
                  bold
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

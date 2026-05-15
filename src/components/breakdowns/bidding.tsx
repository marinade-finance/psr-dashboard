import React from 'react'

import { cost, pmpe, topUp } from 'src/format'
import { computeBidding } from 'src/services/bidding'
import { computeInAuctionTarget } from 'src/services/in-auction-target'
import { computeNextEpochStake } from 'src/services/next-epoch-stake'

import { CalcCard, type CardStatus } from './card'
import { OkRow, RevRow, SectionHeader } from './row'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { BondCoverage } from 'src/services/bond-coverage'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  winningTotalPmpe: number
  coverage: BondCoverage
  isSimulated?: boolean
  onGoToSim?: () => void
}

const STATIC_BID_HELP =
  'The fixed CPMPE you configure on-chain — the same number the Simulate ' +
  'input shows. Different from the auction effective bid, which is the ' +
  'clearing price every winner actually pays.'

const NON_BID_HELP =
  'Your inflation + MEV + block-rewards PMPE — the revenue you bring ' +
  'before any bid. The target bid below is the winning bar minus this.'

const IN_AUCTION_HELP =
  'Closed-form estimate. Adding or growing this winner shifts the clearing ' +
  'price, so treat it as a floor and confirm in Simulate.'

const NEXT_EPOCH_HELP =
  'Being in the set is not the same as receiving stake. The redelegation ' +
  'budget is handed out greedily by total PMPE, highest first, until it ' +
  'runs out. Raising your bid reorders the queue and moves the bar — this ' +
  'is a heuristic, verify in Simulate.'

const PRIORITY_RANK_HELP =
  'Where you sit when the budget is handed out: validators are served in ' +
  'total PMPE order, highest first. A smaller number means the budget ' +
  'reaches you sooner.'

const BID_GAP_HELP =
  'Static bid minus the auction clearing price. A gap above 0 means you ' +
  'are bidding more than you need to clear today — it does not raise ' +
  'your priority rank, since the queue is ordered on total PMPE, not bid.'

// "What should I bid to get into the auction and win stake?" — the
// actionable story, two parallel goals: get IN, get STAKE. Both sections
// share the same row shape (bar → your total → target total → target
// bid → bid increase) so the user reads them as parallel math. Stake
// position and the bid-cost story live in the Payments tab; this tab is
// purely about what to bid. Math comes verbatim from the existing
// selectors — this component only arranges the rows.
export const BiddingBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  auctionResult,
  winningTotalPmpe,
  coverage,
  isSimulated,
  onGoToSim,
}) => {
  const m = computeBidding(validator)
  const inAuction = computeInAuctionTarget(
    validator,
    winningTotalPmpe,
    coverage,
  )
  const nextEpoch = computeNextEpochStake(validator, auctionResult)
  const noFrontier = nextEpoch.priorityFrontierPmpe <= 0

  const clears = inAuction.bidIncrease <= 0 && !inAuction.capConstrained
  const status: CardStatus = inAuction.capConstrained
    ? {
        label: `A concentration cap is full — raising your bid alone will not get you in. See ${inAuction.capConstraintName ?? 'the cap'} below.`,
        tone: 'yellow',
      }
    : clears
      ? {
          label: `Already clears — keep your static bid at or above ${pmpe(inAuction.targetBidPmpe)} PMPE.`,
          tone: 'green',
        }
      : {
          label: `Bid ${pmpe(inAuction.currentBidPmpe)} → ${pmpe(inAuction.targetBidPmpe)} PMPE to clear the winning bar.`,
          tone: 'red',
        }

  const tip = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline text-left"
      onClick={onGoToSim}
    >
      Simulate this bid to confirm the exact figure →
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
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader
            title="Your cost-PMPE today"
            help="What you bring to the auction this epoch: non-bid revenue (the commission you keep) plus your static bid. The two target sections below subtract your non-bid revenue from each bar to size the bid."
            unit="PMPE"
            colSpan={4}
          />
          <RevRow label="Inflation" pct={m.inflPct} pmpe={pmpe(m.inflPmpe)} />
          <RevRow label="MEV" pct={m.mevPct} pmpe={pmpe(m.mevPmpe)} />
          <RevRow label="Block rewards" pct={m.blkPct} pmpe={pmpe(m.blkPmpe)} />
          <RevRow
            label="Non-bid revenue"
            help={NON_BID_HELP}
            pmpe={pmpe(inAuction.nonBidPmpe)}
            bold
          />
          <RevRow
            label="Static bid"
            help={STATIC_BID_HELP}
            pmpe={pmpe(inAuction.currentBidPmpe)}
          />
          <RevRow
            label="Total"
            pmpe={pmpe(inAuction.nonBidPmpe + inAuction.currentBidPmpe)}
            bold
            separator
          />

          <SectionHeader
            title="Goal A — get into the auction"
            help={IN_AUCTION_HELP}
            unit="PMPE"
            colSpan={4}
          />
          <RevRow
            label="Winning bar PMPE"
            pmpe={pmpe(inAuction.winningTotalPmpe)}
          />
          <RevRow
            label="Your current total"
            pmpe={pmpe(inAuction.nonBidPmpe + inAuction.currentBidPmpe)}
          />
          <RevRow
            label="Target static bid"
            pmpe={pmpe(inAuction.targetBidPmpe)}
            bold
          />
          {inAuction.capConstrained ? (
            <RevRow
              label={`Binding cap — ${inAuction.capConstraintName ?? 'concentration'} is full`}
              value="blocked"
              severity="error"
              bold
            />
          ) : inAuction.bidIncrease > 0 ? (
            <RevRow
              label="Bid increase needed"
              pmpe={pmpe(inAuction.bidIncrease)}
              severity="warning"
              bold
            />
          ) : (
            <OkRow
              message="Your bid already clears the winning bar."
              colSpan={3}
            />
          )}
          <RevRow
            label="Minimum bond required"
            value={cost(inAuction.bondFloorToBack)}
          />
          {inAuction.bondTopUp > 0 ? (
            <RevRow
              label="Bond top-up to keep stake"
              value={topUp(inAuction.bondTopUp)}
              severity="warning"
              bold
            />
          ) : (
            <OkRow message="Bond covers the stake." colSpan={3} />
          )}

          <SectionHeader
            title="Goal B — get stake next epoch"
            help={NEXT_EPOCH_HELP}
            unit="PMPE"
            colSpan={4}
          />
          {noFrontier ? (
            <OkRow
              message="No binding priority bar this run — every winner gets served."
              colSpan={3}
            />
          ) : (
            <>
              <RevRow
                label="Priority bar PMPE"
                pmpe={pmpe(nextEpoch.priorityFrontierPmpe)}
              />
              <RevRow
                label="Your current total"
                pmpe={pmpe(nextEpoch.currentTotalPmpe)}
              />
              <RevRow
                label="Target static bid"
                pmpe={pmpe(nextEpoch.targetBidPmpePriority)}
                bold
              />
              {nextEpoch.bidIncreaseForPriority > 0 ? (
                <RevRow
                  label="Bid increase needed"
                  pmpe={pmpe(nextEpoch.bidIncreaseForPriority)}
                  severity="warning"
                  bold
                />
              ) : (
                <OkRow
                  message="You already clear the priority bar."
                  colSpan={3}
                />
              )}
              <RevRow
                label="Your priority rank"
                help={PRIORITY_RANK_HELP}
                value={`#${nextEpoch.priorityRank}`}
              />
              <RevRow
                label="Your bid gap"
                help={BID_GAP_HELP}
                pmpe={pmpe(nextEpoch.bidGapPmpe)}
              />
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

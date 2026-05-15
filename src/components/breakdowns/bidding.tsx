import React from 'react'

import { cost, pmpe, stake, topUp } from 'src/format'
import { computeBidding } from 'src/services/bidding'
import { computeInAuctionTarget } from 'src/services/in-auction-target'
import { computeNextEpochStake } from 'src/services/next-epoch-stake'
import { selectExpectedStakeChange } from 'src/services/sam'

import { CalcCard } from './card'
import { OkRow, RevRow, SectionHeader } from './row'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { BondCoverage } from 'src/services/bond-coverage'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  coverage: BondCoverage
  isSimulated?: boolean
  onGoToSim?: () => void
}

const EXPECTED_CHANGE_HELP =
  'This can be 0 even when your target stake is above your active ' +
  'stake. The redelegation budget is handed out to higher-priority ' +
  'validators first, or you are cap or bond constrained, so no net ' +
  'inflow is expected next epoch.'

// "What should I bid to get into the auction and win stake?" — the
// actionable story. The two advisory tables are the centerpiece; the
// stake position, current-vs-winning bid gap and cost-PMPE composition
// are supporting context framed toward that question. Math comes verbatim
// from the existing selectors — this component only arranges the rows.
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

  const delta = selectExpectedStakeChange(validator)
  const deltaSeverity = delta > 0 ? 'ok' : delta < 0 ? 'error' : undefined
  const deltaText =
    delta === 0 ? '0 SOL' : `${delta > 0 ? '+' : ''}${stake(delta)}`

  const inSet = inAuction.inSet
  const clears = inAuction.bidIncrease <= 0 && !inAuction.capConstrained
  const status: { label: string; tone: 'red' | 'green' | 'yellow' } =
    inSet && clears
      ? {
          label: `Your bid clears the winning bar — you are in the auction. Bid ${pmpe(inAuction.targetBidPmpe)} PMPE or more to stay in.`,
          tone: 'green',
        }
      : inAuction.capConstrained
        ? {
            label:
              'A concentration cap is full, so raising your bid alone will not get you in — see the Get into the auction section.',
            tone: 'yellow',
          }
        : {
            label: `Raise your static bid to ${pmpe(inAuction.targetBidPmpe)} PMPE to clear the winning bar and get into the auction.`,
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
          <SectionHeader title="Stake position" unit="SOL" colSpan={4} />
          <RevRow label="Active Marinade stake" value={stake(m.active)} />
          <RevRow label="Target Marinade stake" value={stake(m.target)} />
          <RevRow
            label="Expected change next epoch"
            help={EXPECTED_CHANGE_HELP}
            value={deltaText}
            severity={deltaSeverity}
          />

          <SectionHeader
            title="Cost-PMPE composition"
            help="Your non-bid revenue plus your static bid. This is the input to the target-bid math below — the bid you need is the winning bar minus your non-bid revenue."
            unit="PMPE"
            colSpan={4}
          />
          <RevRow label="Inflation" pct={m.inflPct} pmpe={pmpe(m.inflPmpe)} />
          <RevRow label="MEV" pct={m.mevPct} pmpe={pmpe(m.mevPmpe)} />
          <RevRow label="Block rewards" pct={m.blkPct} pmpe={pmpe(m.blkPmpe)} />
          <RevRow label="Static bid" pmpe={pmpe(m.bid)} />
          <RevRow
            label="Total"
            pmpe={pmpe(m.inflPmpe + m.mevPmpe + m.blkPmpe + m.bid)}
            bold
            separator
          />

          <SectionHeader title="Bid gap" unit="PMPE" colSpan={4} />
          <RevRow label="Static bid" pmpe={pmpe(m.bid)} />
          <RevRow label="Auction effective bid" pmpe={pmpe(m.effBid)} />
          <RevRow label="Resulting bid gap" pmpe={pmpe(m.bidGap)} bold />

          <SectionHeader
            title="Get into the auction"
            help="Closed-form estimate. Adding or growing this winner shifts the clearing price, so treat it as a floor and confirm in Simulate."
            unit="PMPE"
            colSpan={4}
          />
          <RevRow
            label="Winning total"
            pmpe={pmpe(inAuction.winningTotalPmpe)}
          />
          <RevRow label="Non-bid revenue" pmpe={pmpe(inAuction.nonBidPmpe)} />
          <RevRow
            label="Current static bid"
            pmpe={pmpe(inAuction.currentBidPmpe)}
          />
          <RevRow
            label="Target static bid"
            pmpe={pmpe(inAuction.targetBidPmpe)}
            bold
          />
          {inAuction.bidIncrease > 0 ? (
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
            bold
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
          {inAuction.capConstrained && (
            <RevRow
              label={`Binding cap — ${inAuction.capConstraintName ?? 'concentration'} is full`}
              value="blocked"
              severity="error"
              bold
            />
          )}

          <SectionHeader
            title="Get stake next epoch"
            help="Being in the set is not the same as getting stake. Redelegation budget is handed out greedily by total PMPE, highest first, until it runs out — this estimate moves as bids change, so confirm in Simulate."
            unit="PMPE"
            colSpan={4}
          />
          <RevRow
            label="Expected stake change"
            pmpe={
              nextEpoch.expectedDeltaSol === 0
                ? '—'
                : `${nextEpoch.expectedDeltaSol > 0 ? '+' : ''}${stake(nextEpoch.expectedDeltaSol)}`
            }
          />
          <RevRow
            label="Stake the budget pushes to you"
            help="SOL the redelegation budget is expected to send into this validator next epoch. The budget is handed out greedily, highest total PMPE first, to validators below their target — this is what reaches you before the budget runs dry."
            pmpe={stake(nextEpoch.redelegationInflowSol)}
          />
          <RevRow
            label="Redelegation budget this run"
            pmpe={stake(nextEpoch.redelegationBudgetSol)}
          />
          <RevRow
            label="Your priority rank"
            help="Where you sit when the budget is handed out: validators are served in total PMPE order, highest first. A smaller number means the budget reaches you sooner."
            value={`#${nextEpoch.priorityRank}`}
          />
          <RevRow
            label="Your bid gap"
            help="Your static bid minus the auction clearing price. A gap above 0 means you are bidding more than you need to clear today — it does not raise your priority rank, since the budget is ordered on total PMPE, not bid."
            pmpe={pmpe(nextEpoch.bidGapPmpe)}
          />
          {noFrontier ? (
            <OkRow message="No binding priority bar this run." colSpan={3} />
          ) : (
            <>
              <RevRow
                label="Priority bar total"
                pmpe={pmpe(nextEpoch.priorityFrontierPmpe)}
              />
              <RevRow
                label="Your current total"
                pmpe={pmpe(nextEpoch.currentTotalPmpe)}
              />
              <RevRow
                label="Target total"
                pmpe={pmpe(nextEpoch.targetTotalPmpePriority)}
                bold
              />
              <RevRow
                label="Target static bid"
                pmpe={pmpe(nextEpoch.targetBidPmpePriority)}
                bold
              />
              {nextEpoch.bidIncreaseForPriority > 0 ? (
                <RevRow
                  label="Bid increase for priority"
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
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

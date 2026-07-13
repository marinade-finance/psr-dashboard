import { AuctionConstraintType } from '@marinade.finance/ds-sam-sdk'
import React from 'react'

import { pmpe } from 'src/format'
import { computeBidding } from 'src/services/bidding'
import { computeInAuctionTarget } from 'src/services/in-auction-target'
import { computeNextEpochStake } from 'src/services/next-epoch-stake'

import { CalcCard, withSimAction, type CardStatus } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

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

const STATIC_BID_HELP =
  'The fixed Cost PMPE you configure on-chain — the same number the Simulate ' +
  'input shows. Different from the effective bid, which is the ' +
  'clearing price every winner actually pays.'

const NON_BID_HELP =
  'Your inflation + MEV + block-rewards PMPE — the revenue you bring ' +
  'before any bid. The target bid below is the winning total PMPE minus this.'

const IN_AUCTION_HELP =
  'Closed-form estimate. Adding or growing this winner shifts the clearing ' +
  'price, so treat it as a floor and confirm in Simulate. Country and ' +
  'ASO (Autonomous System Operator — the hosting provider) caps can also ' +
  'block you regardless of bid.'

const NEXT_EPOCH_HELP =
  'Being in the set is not the same as receiving stake. The redelegation ' +
  'budget is handed out greedily by total PMPE, highest first, until it ' +
  'runs out. Raising your bid reorders the queue and moves the level — this ' +
  'is a heuristic, verify in Simulate.'

const PRIORITY_RANK_HELP =
  'Where you sit when the budget is handed out: validators are served in ' +
  'total PMPE order, highest first. A smaller number means the budget ' +
  'reaches you sooner.'

const BID_GAP_HELP =
  "Static bid minus the auction's clearing rate. You only ever pay the " +
  'clearing rate, but your full static bid counts toward your total PMPE — ' +
  'so bidding above the clearing rate does push you up the priority queue, ' +
  'at no extra cost at settlement.'

// "What should I bid to get into the auction and win stake?" — the
// actionable story, two parallel goals: get IN, get STAKE. Each section
// has a PMPE build-up; the bond requirement (SOL) for "Get into the
// auction" lives in its own SOL sub-section so no column ever mixes
// units. Math comes verbatim from the existing selectors — this
// component only arranges the rows.
export const BiddingBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  auctionResult,
  dsSamConfig,
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
  const nextEpoch = computeNextEpochStake(
    validator,
    auctionResult,
    dsSamConfig.minBondBalanceSol,
  )
  const noFrontier = nextEpoch.priorityFrontierPmpe <= 0

  // Cap label. Country/ASO names are meaningful — show them. VALIDATOR's
  // "name" is the vote account → omit. WANT/other → generic.
  const capName = inAuction.capConstraintName
  const capLabel =
    inAuction.capConstraintType === AuctionConstraintType.COUNTRY
      ? `Country cap is at the limit${capName ? ` — ${capName}` : ''}`
      : inAuction.capConstraintType === AuctionConstraintType.ASO
        ? `ASO cap is at the limit${capName ? ` — ${capName}` : ''}`
        : inAuction.capConstraintType === AuctionConstraintType.VALIDATOR
          ? 'Per-validator cap is at the limit'
          : inAuction.capConstraintType === AuctionConstraintType.WANT
            ? 'At your `maxStakeWanted` setting'
            : capName
              ? `${capName} concentration cap is at the limit`
              : 'A concentration cap is at the limit'

  const clears = inAuction.bidIncrease <= 0 && !inAuction.capConstrained
  const baseStatus: Omit<CardStatus, 'action'> = inAuction.capConstrained
    ? {
        label: `${capLabel} — raising your bid alone will not get you in.`,
        severity: 'warning',
      }
    : clears
      ? {
          label: `Already clears — keep your static bid at or above ${pmpe(inAuction.targetBidPmpe)} PMPE.`,
          severity: 'good',
        }
      : {
          label: `Bid ${pmpe(inAuction.currentBidPmpe)} → ${pmpe(inAuction.targetBidPmpe)} PMPE to clear the winning total PMPE.`,
          severity: 'critical',
        }
  const status: CardStatus = withSimAction(baseStatus, onGoToSim)

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
    >
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader
            title="Your bid today"
            help="What you bring to the auction this epoch: non-bid revenue (inflation + MEV + block rewards PMPE you bring at your commissions) plus your static bid. The two target sections below subtract your non-bid revenue from each threshold to size the bid."
            unit="PMPE"
          />
          <CalcRow
            label="Inflation"
            help="Your inflation commission and epoch PMPE per 1000 SOL."
            col1={m.inflPct}
            col2={pmpe(m.inflPmpe)}
          />
          <CalcRow
            label="MEV"
            help="MEV (Maximal Extractable Value) — extra tips from transaction ordering. Shows your MEV commission and epoch PMPE per 1000 SOL."
            col1={m.mevPct}
            col2={pmpe(m.mevPmpe)}
          />
          <CalcRow
            label="Block rewards"
            help="Your block-reward share and epoch PMPE per 1000 SOL."
            col1={m.blkPct}
            col2={pmpe(m.blkPmpe)}
          />
          <CalcRow
            label="Non-bid revenue"
            help={NON_BID_HELP}
            col2={pmpe(inAuction.nonBidPmpe)}
            bold
          />
          <CalcRow
            label="Static bid"
            help={STATIC_BID_HELP}
            col2={pmpe(inAuction.currentBidPmpe)}
          />
          <CalcRow
            label="Total"
            col2={pmpe(inAuction.nonBidPmpe + inAuction.currentBidPmpe)}
            bold
            separator
          />

          <SectionHeader
            title="Get into the auction"
            help={IN_AUCTION_HELP}
            unit="PMPE"
          />
          <CalcRow
            label="Winning total"
            help="The lowest total PMPE that still makes the winning set this epoch. Beat it and you are in, fall short and you are out."
            col2={pmpe(inAuction.winningTotalPmpe)}
          />
          <CalcRow
            label="− Non-bid revenue"
            help={NON_BID_HELP}
            col2={pmpe(inAuction.nonBidPmpe)}
          />
          <CalcRow
            label="= Target static bid"
            col2={pmpe(inAuction.targetBidPmpe)}
            bold
            separator
          />
          <CalcRow
            label="Your static bid"
            help={STATIC_BID_HELP}
            col2={pmpe(inAuction.currentBidPmpe)}
          />
          {inAuction.capConstrained ? (
            <CalcRow label={capLabel} col2="blocked" severity="error" bold />
          ) : inAuction.bidIncrease > 0 ? (
            <CalcRow
              label="Bid increase needed"
              col2={pmpe(inAuction.bidIncrease)}
              severity="warning"
              bold
              separator
            />
          ) : (
            <OkRow
              message="Your bid already clears the winning total PMPE."
              colSpan={2}
            />
          )}

          <SectionHeader
            title="Get stake delegated next epoch"
            help={NEXT_EPOCH_HELP}
            unit="PMPE"
          />
          {noFrontier ? (
            <OkRow
              message="No binding priority frontier PMPE this run — every winner gets served."
              colSpan={2}
            />
          ) : nextEpoch.bidIncreaseForPriority <= 0 ? (
            // Already clears the frontier — the target-derivation rows
            // (Priority frontier / − Non-bid / = Target bid) describe a bid
            // the validator would never need to make. Skip them; show only
            // the green confirmation and the two context rows so a reader
            // can still verify their position.
            <>
              <OkRow
                message={`Clears the priority frontier (${pmpe(nextEpoch.priorityFrontierPmpe)} PMPE).`}
                colSpan={2}
              />
              <CalcRow
                label="Your priority rank"
                help={PRIORITY_RANK_HELP}
                col2={
                  nextEpoch.priorityRank == null
                    ? '—'
                    : `#${nextEpoch.priorityRank}`
                }
              />
              <CalcRow
                label="Your bid gap"
                help={BID_GAP_HELP}
                col2={pmpe(nextEpoch.bidGapPmpe)}
              />
            </>
          ) : (
            <>
              <CalcRow
                label="Priority frontier"
                help="Lowest total PMPE still fully funded by the redelegation budget."
                col2={pmpe(nextEpoch.priorityFrontierPmpe)}
              />
              <CalcRow
                label="− Non-bid revenue"
                help={NON_BID_HELP}
                col2={pmpe(inAuction.nonBidPmpe)}
              />
              <CalcRow
                label="= Target static bid"
                col2={pmpe(nextEpoch.targetBidPmpePriority)}
                bold
                separator
              />
              <CalcRow
                label="Bid increase needed"
                col2={pmpe(nextEpoch.bidIncreaseForPriority)}
                severity="warning"
                bold
              />
              <CalcRow
                label="Your priority rank"
                help={PRIORITY_RANK_HELP}
                col2={
                  nextEpoch.priorityRank == null
                    ? '—'
                    : `#${nextEpoch.priorityRank}`
                }
              />
              <CalcRow
                label="Your bid gap"
                help={BID_GAP_HELP}
                col2={pmpe(nextEpoch.bidGapPmpe)}
              />
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

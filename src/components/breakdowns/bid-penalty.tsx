import React from 'react'

import { cost, pct, pmpe, stake } from 'src/format'
import { computeBidPenalty } from 'src/services/bid-penalty'

import { CalcCard, type CardStatus } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

type Props = {
  title: string
  guideTo?: string
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  isSimulated?: boolean
  onGoToSim?: () => void
}

export const BidPenaltyBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  dsSamConfig,
  winningTotalPmpe,
  isSimulated,
  onGoToSim,
}) => {
  const metrics = computeBidPenalty(validator, dsSamConfig, winningTotalPmpe)

  const baseStatus: Omit<CardStatus, 'action'> = {
    label:
      metrics.penaltySol > 0
        ? `Raise bid or pay a ${cost(metrics.penaltySol)} penalty this epoch.`
        : metrics.isNegativeBiddingChange
          ? 'Bid dropped this epoch but bond obligation covers it — no penalty.'
          : 'Bid did not decrease — no penalty.',
    tone: metrics.penaltySol > 0 ? 'red' : 'green',
  }
  const status: CardStatus = onGoToSim
    ? {
        ...baseStatus,
        action: {
          label: metrics.penaltyPmpe > 0 ? 'Raise bid in sim →' : 'Simulate →',
          tone: 'yellow',
          onClick: onGoToSim,
        },
      }
    : baseStatus

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
    >
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader
            title="Bid history"
            help="Your bid last epoch versus this epoch. If it dropped, the penalty checks whether your bond still covers what you previously promised."
            unit="PMPE"
          />
          <CalcRow
            label="Last epoch bid"
            col2={pmpe(metrics.lastEpochBidPmpe)}
          />
          <CalcRow
            label="This epoch bid"
            col2={pmpe(metrics.thisEpochBidPmpe)}
          />
          {(() => {
            const d = metrics.thisEpochBidPmpe - metrics.lastEpochBidPmpe
            return (
              <CalcRow
                label="Bid change this epoch"
                col2={`${d > 0 ? '+' : d < 0 ? '−' : ''}${pmpe(Math.abs(d))}`}
                severity={
                  metrics.isNegativeBiddingChange
                    ? 'error'
                    : d > 0
                      ? 'ok'
                      : undefined
                }
              />
            )
          })()}

          <SectionHeader
            title="Historical baseline"
            help="The lowest bid you held over the recent window. Your bid can drop, but not below this — or the penalty fires."
            unit="PMPE"
          />
          <CalcRow
            label={`Historical bid limit — ${metrics.historyEpochs} epoch window`}
            help="The lowest effective participating bid PMPE seen across the recent history window. Defines a floor — your bid can't drop below it without triggering the penalty."
            col2={pmpe(metrics.worstHistoricalPmpe)}
          />

          <SectionHeader
            title="Threshold"
            help="The level your bond has to clear this epoch. Built from the auction's winning total PMPE and your current participating bid — whichever is lower sets the level."
            unit="PMPE"
          />
          <CalcRow
            label="Winning total"
            help="The lowest total PMPE that still made the winning set this epoch — same metric as the winning total PMPE in the Bidding tab. One of the two inputs to the threshold."
            col2={pmpe(metrics.winningTotalPmpe)}
          />
          <CalcRow
            label="Effective participating bid"
            help="The portion of your bid the auction counts toward the threshold this epoch. Lower than your static bid when the auction caps it."
            col2={pmpe(metrics.effParticipatingBidPmpe)}
          />
          <CalcRow
            label="Effective limit"
            help="The lower of your current effective participating bid PMPE and the historical bid limit. Whichever is smaller becomes the threshold the penalty checks against."
            col2={pmpe(metrics.limit)}
          />
          <CalcRow
            label="Adjusted limit after permitted deviation"
            help="The effective limit with a small grace margin subtracted. Your bond obligation is allowed to land below the raw limit, but not below this adjusted level."
            col2={pmpe(metrics.adjustedLimit)}
          />
          <CalcRow
            label="Bond obligation"
            help="The per-epoch rate your bond currently backs, expressed as PMPE. The penalty fires when this falls below the adjusted limit above."
            col2={pmpe(metrics.bondObligationPmpe)}
          />
          <CalcRow
            label="Shortfall"
            help="How far the bond obligation lands below the adjusted limit. Positive only triggers a penalty if you also dropped your bid this epoch."
            col2={pmpe(metrics.shortfall)}
            bold
            separator
            severity={
              metrics.shortfall === 0
                ? 'ok'
                : metrics.isNegativeBiddingChange
                  ? 'error'
                  : undefined
            }
          />

          <SectionHeader
            title="Penalty coefficient"
            help="Computed from how far the bond obligation sits below the adjusted limit. Non-zero only when your bid also dropped this epoch."
          />
          <CalcRow
            label="Penalty coefficient"
            col2={pct(metrics.penaltyCoef, 2)}
          />

          <SectionHeader
            title="Penalty rate"
            help="The per-1000-SOL charge before it is scaled by your stake. Coefficient times penalty base."
            unit="PMPE"
          />
          <CalcRow
            label="Penalty base"
            help="Winning PMPE plus your effective participating bid PMPE. The penalty coefficient is applied to this sum to size the per-PMPE charge."
            col2={pmpe(metrics.base)}
          />
          <CalcRow
            label="Penalty"
            col2={pmpe(metrics.penaltyPmpe)}
            severity={metrics.penaltyPmpe > 0 ? 'error' : undefined}
            bold
          />

          <SectionHeader
            title="Penalty this epoch"
            help="The actual SOL charge: penalty rate scaled to your Marinade-activated stake. Collected as forced stake undelegation."
          />
          <CalcRow
            label="Marinade activated stake"
            col2={stake(metrics.marinadeActivatedStakeSol)}
          />
          {metrics.penaltySol > 0 ? (
            <CalcRow
              label="Penalty this epoch"
              col2={cost(metrics.penaltySol)}
              total
              severity="error"
            />
          ) : (
            <OkRow message="No penalty deducted this epoch." />
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

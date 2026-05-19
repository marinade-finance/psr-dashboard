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

  const status: CardStatus = {
    label:
      metrics.penaltyPmpe > 0
        ? `Penalty active: ${pmpe(metrics.penaltyPmpe)} PMPE this epoch.`
        : metrics.isNegativeBiddingChange
          ? 'Bid dropped this epoch but bond obligation covers it — no penalty.'
          : 'Bid did not decrease — no penalty.',
    tone: metrics.penaltyPmpe > 0 ? 'red' : 'green',
  }

  const tip = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      {metrics.penaltyPmpe > 0
        ? `Raise bid to ≥ ${pmpe(metrics.adjustedLimit)} PMPE in simulation →`
        : 'Simulate bid or commission changes →'}
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
          <SectionHeader title="Bid history" unit="PMPE" />
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

          <SectionHeader title="Historical baseline" unit="PMPE" />
          <CalcRow
            label={`Historical bid limit — ${metrics.historyEpochs} epoch window`}
            help="The lowest effective participating bid PMPE seen across the recent history window. Defines a floor — your bid can't drop below it without triggering the penalty."
            col2={pmpe(metrics.worstHistoricalPmpe)}
          />

          <SectionHeader title="Threshold" unit="PMPE" />
          <CalcRow label="Winning" col2={pmpe(metrics.winningTotalPmpe)} />
          <CalcRow
            label="Effective participating bid"
            col2={pmpe(metrics.effParticipatingBidPmpe)}
          />
          <CalcRow
            label="Effective limit"
            help="The lower of your current effective participating bid PMPE and the historical bid limit. Whichever is smaller becomes the threshold the penalty checks against."
            col2={pmpe(metrics.limit)}
          />
          <CalcRow
            label="Adjusted limit after permitted deviation"
            col2={pmpe(metrics.adjustedLimit)}
          />
          <CalcRow
            label="Bond obligation"
            col2={pmpe(metrics.bondObligationPmpe)}
          />
          <CalcRow
            label="Shortfall"
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

          <SectionHeader title="Penalty coefficient" />
          <CalcRow
            label="Penalty coefficient"
            col2={pct(metrics.penaltyCoef, 2)}
          />

          <SectionHeader title="Penalty rate" unit="PMPE" />
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

          <SectionHeader title="Penalty this epoch" />
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

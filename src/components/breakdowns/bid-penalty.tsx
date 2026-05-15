import React from 'react'

import { pct, pay, pmpe, stake } from 'src/format'
import { computeBidPenalty } from 'src/services/bid-penalty'

import { CalcCard } from './card'
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

  const status: { label: string; tone: 'red' | 'green' | 'yellow' } = {
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
          <SectionHeader title="Bid history" />
          <CalcRow
            label="Last epoch bid PMPE"
            value={pmpe(metrics.lastEpochBidPmpe)}
          />
          <CalcRow
            label="This epoch bid PMPE"
            value={pmpe(metrics.thisEpochBidPmpe)}
          />
          {(() => {
            const d = metrics.thisEpochBidPmpe - metrics.lastEpochBidPmpe
            return (
              <CalcRow
                label="Bid change this epoch"
                value={`${d > 0 ? '+' : d < 0 ? '−' : ''}${pmpe(Math.abs(d))}`}
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

          <SectionHeader title="Historical baseline" />
          <CalcRow
            label="History window"
            secondary={`${metrics.historyEpochs} epochs`}
          />
          <CalcRow
            label="Historical bid limit"
            help="The lowest effective participating bid PMPE seen across the recent history window. Defines a floor — your bid can't drop below it without triggering the penalty."
            value={pmpe(metrics.worstHistoricalPmpe)}
          />

          <SectionHeader title="Threshold" />
          <CalcRow
            label="Winning PMPE"
            value={pmpe(metrics.winningTotalPmpe)}
          />
          <CalcRow
            label="Effective participating bid PMPE"
            value={pmpe(metrics.effParticipatingBidPmpe)}
          />
          <CalcRow
            label="Effective limit"
            help="The lower of your current effective participating bid PMPE and the historical bid limit. Whichever is smaller becomes the threshold the penalty checks against."
            value={pmpe(metrics.limit)}
          />
          <CalcRow
            label="Adjusted limit after permitted deviation"
            value={pmpe(metrics.adjustedLimit)}
          />
          <CalcRow
            label="Bond obligation PMPE"
            value={pmpe(metrics.bondObligationPmpe)}
          />
          <CalcRow
            label="Shortfall"
            value={pmpe(metrics.shortfall)}
            severity={
              metrics.shortfall === 0
                ? 'ok'
                : metrics.isNegativeBiddingChange
                  ? 'error'
                  : undefined
            }
          />

          <SectionHeader title="Penalty" />
          <CalcRow
            label="Penalty coefficient"
            secondary={pct(metrics.penaltyCoef, 2)}
          />
          <CalcRow
            label="Penalty base"
            help="Winning PMPE plus your effective participating bid PMPE. The penalty coefficient is applied to this sum to size the per-PMPE charge."
            value={pmpe(metrics.base)}
          />
          <CalcRow
            label="Penalty PMPE"
            value={pmpe(metrics.penaltyPmpe)}
            severity={metrics.penaltyPmpe > 0 ? 'error' : undefined}
          />
          {metrics.penaltySol > 0 ? (
            <CalcRow
              label="Penalty this epoch"
              secondary={stake(metrics.marinadeActivatedStakeSol)}
              value={pay(metrics.penaltySol)}
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

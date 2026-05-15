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
      <table className="w-full">
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
          <CalcRow
            label="Bid change this epoch"
            value={pmpe(metrics.thisEpochBidPmpe - metrics.lastEpochBidPmpe)}
            secondary={
              metrics.isNegativeBiddingChange
                ? 'reduced — penalty gate open'
                : 'held — no penalty'
            }
            severity={metrics.isNegativeBiddingChange ? 'error' : 'ok'}
          />
          <CalcRow
            label="History window"
            secondary={`${metrics.historyEpochs} epochs`}
          />
          <CalcRow
            label="Worst historical effective participating bid PMPE"
            value={pmpe(metrics.worstHistoricalPmpe)}
          />

          <SectionHeader title="Threshold" />
          <CalcRow
            label="Effective participating bid PMPE"
            value={pmpe(metrics.effParticipatingBidPmpe)}
          />
          <CalcRow
            label="Limit — minimum of the above"
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
          <CalcRow label="Shortfall" value={pmpe(metrics.shortfall)} bold />

          <SectionHeader title="Penalty" />
          <CalcRow
            label="Penalty coefficient"
            secondary={pct(metrics.penaltyCoef, 2)}
          />
          <CalcRow
            label="Base — winning PMPE + effective participating bid PMPE"
            value={pmpe(metrics.base)}
          />
          <CalcRow
            label="Penalty PMPE"
            value={pmpe(metrics.penaltyPmpe)}
            bold
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

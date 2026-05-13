import React from 'react'

import { formatPercentage, pay, pmpe, stake } from 'src/format'
import { computeBidPenalty } from 'src/services/breakdowns'

import { CalcCard, CalcRow, OkRow, SectionHeader, docsPath } from './shared'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'

type Props = {
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  isSimulated?: boolean
  onGoToSim?: () => void
  level?: UserLevel
}

export const BidPenaltyBreakdown: React.FC<Props> = ({
  validator,
  dsSamConfig,
  winningTotalPmpe,
  isSimulated,
  onGoToSim,
  level,
}) => {
  const metrics = computeBidPenalty(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )

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
      title="Bid Penalty Calculation"
      guideTo={`${docsPath(level)}#bid-penalty`}
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
            secondary={formatPercentage(metrics.penaltyCoef, 2)}
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

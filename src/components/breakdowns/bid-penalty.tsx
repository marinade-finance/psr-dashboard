import React from 'react'

import { formatPercentage, pay, pmpe, stake } from 'src/format'
import { computeBidPenaltyMetrics } from 'src/services/breakdowns'

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
  const m = computeBidPenaltyMetrics(validator, dsSamConfig, winningTotalPmpe)

  const status: { label: string; tone: 'red' | 'green' | 'yellow' } = {
    label:
      m.penaltyPmpe > 0
        ? `Penalty active: ${pmpe(m.penaltyPmpe)} PMPE this epoch.`
        : m.isNegativeBiddingChange
          ? 'Bid dropped this epoch but bond obligation covers it — no penalty.'
          : 'Bid did not decrease — no penalty.',
    tone: m.penaltyPmpe > 0 ? 'red' : 'green',
  }

  const cta = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      {m.penaltyPmpe > 0
        ? `Raise bid to ≥ ${pmpe(m.adjustedLimit)} PMPE in simulation →`
        : 'Simulate bid or commission changes →'}
    </button>
  ) : null

  return (
    <CalcCard
      title="Bid Penalty Calculation"
      guideTo={`${docsPath(level)}#bid-penalty`}
      isSimulated={isSimulated}
      status={status}
      cta={cta}
    >
      <table className="w-full">
        <tbody>
          <SectionHeader title="Bid history" />
          <CalcRow
            label="Last epoch bid PMPE"
            value={pmpe(m.lastEpochBidPmpe)}
          />
          <CalcRow
            label="This epoch bid PMPE"
            value={pmpe(m.thisEpochBidPmpe)}
          />
          <CalcRow
            label="History window"
            secondary={`${m.historyEpochs} epochs`}
            value=""
          />
          <CalcRow
            label="Worst historical effective participating bid PMPE"
            value={pmpe(m.worstHistoricalPmpe)}
          />

          <SectionHeader title="Threshold" />
          <CalcRow
            label="Effective participating bid PMPE"
            value={pmpe(m.effParticipatingBidPmpe)}
          />
          <CalcRow label="Limit — minimum of the above" value={pmpe(m.limit)} />
          <CalcRow
            label="Adjusted limit after permitted deviation"
            value={pmpe(m.adjustedLimit)}
          />
          <CalcRow
            label="Bond obligation PMPE"
            value={pmpe(m.bondObligationPmpe)}
          />
          <CalcRow label="Shortfall" value={pmpe(m.shortfall)} bold />

          <SectionHeader title="Penalty" />
          <CalcRow
            label="Penalty coefficient"
            secondary={formatPercentage(m.penaltyCoef, 2)}
            value=""
          />
          <CalcRow
            label="Base — winning PMPE + effective participating bid PMPE"
            value={pmpe(m.base)}
          />
          <CalcRow
            label="Penalty PMPE"
            value={pmpe(m.penaltyPmpe)}
            bold
            accent={m.penaltyPmpe > 0 ? 'red' : undefined}
          />
          {m.penaltySol > 0 ? (
            <CalcRow
              label="Penalty this epoch"
              secondary={stake(m.marinadeActivatedStakeSol)}
              value={pay(m.penaltySol)}
              bold
              large
              accent="red"
              separator
              marker="red"
            />
          ) : (
            <OkRow message="No penalty deducted this epoch." />
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}

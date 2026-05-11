import React from 'react'

import { pay } from 'src/format'
import {
  computeBidPenaltyMetrics,
  computeSamRevenueMetrics,
} from 'src/services/breakdowns'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard, CalcRow, SectionHeader, docsPath } from './shared'

import type { DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { ProtectedEvent } from 'src/services/protected-events'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  validator: AugmentedAuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  bondRiskFeeSol: number
  blacklistPenaltySol: number
  bidTooLowPenaltySol: number
  psrEstimates: ProtectedEvent[]
  isSimulated?: boolean
  onGoToSim?: () => void
  onGoToPenalty?: () => void
  level?: UserLevel
}

export const PaymentsBreakdown: React.FC<Props> = ({
  validator,
  dsSamConfig,
  winningTotalPmpe,
  bondRiskFeeSol,
  blacklistPenaltySol,
  bidTooLowPenaltySol,
  psrEstimates,
  isSimulated,
  onGoToSim,
  onGoToPenalty,
  level,
}) => {
  const paymentMetrics = computeSamRevenueMetrics(validator)
  const penaltyMetrics = computeBidPenaltyMetrics(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )
  const psrTotal = psrEstimates.reduce(
    (sum, estimate) => sum + selectAmount(estimate),
    0,
  )
  const total =
    paymentMetrics.total +
    bidTooLowPenaltySol +
    blacklistPenaltySol +
    bondRiskFeeSol +
    psrTotal
  const hasPenalty =
    bidTooLowPenaltySol > 0 ||
    blacklistPenaltySol > 0 ||
    bondRiskFeeSol > 0 ||
    psrTotal > 0

  const status: { label: string; tone: 'red' | 'green' | 'yellow' } = {
    label: hasPenalty
      ? `You will pay ${pay(total)} in total this epoch — includes penalties.`
      : `You will pay ${pay(total)} in total this epoch — no penalties.`,
    tone: hasPenalty ? 'red' : 'green',
  }

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
      title="Payments Calculation"
      guideTo={`${docsPath(level)}#detail-panel`}
      isSimulated={isSimulated}
      status={status}
      tip={tip}
    >
      <table className="w-full">
        <tbody>
          <SectionHeader title="Bid costs" />
          <CalcRow label="Active Stake Cost" value={pay(paymentMetrics.cost)} />
          <CalcRow
            label="Activating Stake Cost"
            value={pay(paymentMetrics.activatingCost)}
          />
          <SectionHeader title="Penalties" />
          <CalcRow
            label="Bid-too-low penalty"
            value={bidTooLowPenaltySol > 0 ? pay(bidTooLowPenaltySol) : '—'}
          />
          <CalcRow
            label="Blacklist penalty"
            value={blacklistPenaltySol > 0 ? pay(blacklistPenaltySol) : '—'}
          />
          <CalcRow
            label="Bond risk fee"
            value={bondRiskFeeSol > 0 ? pay(bondRiskFeeSol) : '—'}
          />
          {psrEstimates.length > 0 && (
            <>
              <SectionHeader title="PSR Settlements (estimated)" />
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
                    value={pay(selectAmount(estimate))}
                  />
                )
              })}
            </>
          )}
          <CalcRow
            label="Total"
            value={pay(total)}
            total
            accent={hasPenalty ? 'red' : 'green'}
            marker={hasPenalty ? 'red' : 'green'}
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

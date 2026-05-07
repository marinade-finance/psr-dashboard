import React from 'react'

import { pay } from 'src/format'
import { docsPath } from 'src/lib/utils'
import {
  computeBidPenaltyMetrics,
  computeSamRevenueMetrics,
} from 'src/services/breakdowns'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard, CalcRow, SectionHeader } from './shared'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { ProtectedEvent } from 'src/services/protected-events'

type Props = {
  validator: AuctionValidator
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
  const psrTotal = psrEstimates.reduce((sum, e) => sum + selectAmount(e), 0)
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

  const cta = (
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
      cta={cta}
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
            accent={bidTooLowPenaltySol > 0 ? 'red' : undefined}
          />
          <CalcRow
            label="Blacklist penalty"
            value={blacklistPenaltySol > 0 ? pay(blacklistPenaltySol) : '—'}
            accent={blacklistPenaltySol > 0 ? 'red' : undefined}
          />
          <CalcRow
            label="Bond risk fee"
            value={bondRiskFeeSol > 0 ? pay(bondRiskFeeSol) : '—'}
            accent={bondRiskFeeSol > 0 ? 'red' : undefined}
          />
          {psrEstimates.length > 0 && (
            <>
              <SectionHeader title="PSR Settlements (estimated)" />
              {psrEstimates.map((e, i) => {
                const label = isProtectedEvent(e.reason)
                  ? selectProtectedStakeReason(e)
                  : e.reason
                return (
                  <CalcRow
                    key={i}
                    label={String(label)}
                    secondary={
                      e.meta.funder === 'ValidatorBond'
                        ? 'from bond'
                        : 'from Marinade'
                    }
                    value={pay(selectAmount(e))}
                    accent="red"
                  />
                )
              })}
            </>
          )}
          <CalcRow
            label="Total"
            value={pay(total)}
            bold
            large
            separator
            marker={hasPenalty ? 'red' : 'green'}
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

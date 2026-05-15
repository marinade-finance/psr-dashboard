import React from 'react'

import { cost } from 'src/format'
import { computeBidPenalty } from 'src/services/bid-penalty'
import { computeBidding } from 'src/services/bidding'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard } from './card'
import { CalcRow, SectionHeader } from './row'

import type { DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { ProtectedEvent } from 'src/services/protected-events'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
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
}

export const PaymentsBreakdown: React.FC<Props> = ({
  title,
  guideTo,
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
}) => {
  const paymentMetrics = computeBidding(validator)
  const penaltyMetrics = computeBidPenalty(
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

  const penaltyTotal =
    bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol + psrTotal
  const status: { label: string; tone: 'red' | 'green' | 'yellow' } = {
    label: hasPenalty
      ? `You will pay ${cost(total)} in total this epoch — including ${cost(penaltyTotal)} in penalties.`
      : `You will pay ${cost(total)} in total this epoch — no penalties.`,
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
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
      tip={tip}
    >
      <table className="w-full max-w-xs">
        <tbody>
          <SectionHeader title="Bid costs" />
          <CalcRow
            label="Active stake cost"
            value={cost(paymentMetrics.cost)}
          />
          <CalcRow
            label="Activating stake cost"
            value={cost(paymentMetrics.activatingCost)}
          />
          <SectionHeader title="Penalties" />
          <CalcRow
            label="Bid-too-low penalty"
            value={bidTooLowPenaltySol > 0 ? cost(bidTooLowPenaltySol) : '—'}
          />
          <CalcRow
            label="Blacklist penalty"
            value={blacklistPenaltySol > 0 ? cost(blacklistPenaltySol) : '—'}
          />
          <CalcRow
            label="Bond risk fee"
            value={bondRiskFeeSol > 0 ? cost(bondRiskFeeSol) : '—'}
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
                    value={cost(selectAmount(estimate))}
                  />
                )
              })}
            </>
          )}
          <CalcRow
            label="Total per epoch"
            value={cost(total)}
            total
            severity={hasPenalty ? 'error' : 'ok'}
          />
        </tbody>
      </table>
    </CalcCard>
  )
}

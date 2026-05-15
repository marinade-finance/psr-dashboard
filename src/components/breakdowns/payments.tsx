import React from 'react'

import { cost, pmpe } from 'src/format'
import { computeBidding } from 'src/services/bidding'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard, type CardStatus } from './card'
import { RevRow, SectionHeader } from './row'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  title: string
  guideTo?: string
  validator: AugmentedAuctionValidator
  bondRiskFeeSol: number
  blacklistPenaltySol: number
  bidTooLowPenaltySol: number
  psrEstimates: ProtectedEvent[]
  isSimulated?: boolean
  onGoToSim?: () => void
  onGoToPenalty?: () => void
}

// "How much will I pay?" — the cost story only. Bid cost (active +
// activating stake), every penalty, conditional PSR settlements, and the
// grand total. Forward-looking "what should I bid" lives in the Bidding
// tab; this tab is purely explanatory. Math comes verbatim from the
// existing selectors — this component only arranges the rows.
export const PaymentsBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  bondRiskFeeSol,
  blacklistPenaltySol,
  bidTooLowPenaltySol,
  psrEstimates,
  isSimulated,
  onGoToSim,
  onGoToPenalty,
}) => {
  const m = computeBidding(validator)

  const psrTotal = psrEstimates.reduce(
    (sum, estimate) => sum + selectAmount(estimate),
    0,
  )
  const penaltyTotal =
    bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol + psrTotal
  const total = m.total + penaltyTotal
  const hasPenalty = penaltyTotal > 0

  const status: CardStatus = {
    label: hasPenalty
      ? `You will pay ${cost(total)} in total this epoch — including ${cost(penaltyTotal)} in penalties.`
      : `You will pay ${cost(total)} in total this epoch — no penalties.`,
    tone: hasPenalty ? 'red' : 'green',
  }

  const tip = (
    <div className="flex flex-col gap-2">
      {bidTooLowPenaltySol > 0 && onGoToPenalty && (
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
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full max-w-[34rem]">
        <tbody>
          <SectionHeader title="Bid cost" unit="SOL" colSpan={4} />
          <RevRow label="Active stake cost" value={cost(m.cost)} />
          <RevRow
            label="Activating stake cost"
            pmpe={pmpe(m.activatingStakePmpe)}
            value={cost(m.activatingCost)}
          />
          <RevRow label="Bid cost" value={cost(m.total)} bold separator />

          <SectionHeader title="Penalties" unit="SOL" colSpan={4} />
          <RevRow
            label="Bid-too-low penalty"
            value={bidTooLowPenaltySol > 0 ? cost(bidTooLowPenaltySol) : '—'}
          />
          <RevRow
            label="Blacklist penalty"
            value={blacklistPenaltySol > 0 ? cost(blacklistPenaltySol) : '—'}
          />
          <RevRow
            label="Bond risk fee"
            value={bondRiskFeeSol > 0 ? cost(bondRiskFeeSol) : '—'}
          />
          {psrEstimates.length > 0 && (
            <>
              <SectionHeader
                title="PSR settlements — estimated"
                unit="SOL"
                colSpan={4}
              />
              {psrEstimates.map((estimate, i) => {
                const label = isProtectedEvent(estimate.reason)
                  ? selectProtectedStakeReason(estimate)
                  : estimate.reason
                return (
                  <RevRow
                    key={i}
                    label={String(label)}
                    pct={
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
          <RevRow label="Total payment" value={cost(total)} total />
        </tbody>
      </table>
    </CalcCard>
  )
}

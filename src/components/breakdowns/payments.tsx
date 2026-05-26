import React from 'react'

import { cost, pay, pmpe, stake } from 'src/format'
import { computeBidding } from 'src/services/bidding'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'

import { CalcCard, withSimAction, type CardStatus } from './card'
import { CalcRow, SectionHeader } from './row'

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
// tab; this tab is purely explanatory. SOL on every value (inline suffix);
// the activating-stake row carries its PMPE rate in col1 — a single-unit
// column shared with no other kind. Math comes verbatim from the existing
// selectors — this component only arranges the rows.
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

  const baseStatus: Omit<CardStatus, 'action'> = {
    label: hasPenalty
      ? `You will pay ${pay(total, 3)} in total this epoch — including ${pay(penaltyTotal, 3)} in penalties.`
      : `You will pay ${pay(total, 3)} in total this epoch — no penalties.`,
    tone: hasPenalty ? 'red' : 'green',
  }
  const status: CardStatus = withSimAction(baseStatus, onGoToSim)

  // The penalty-link stays as a `tip` (rendered under the status banner) —
  // it's a destructive cross-tab affordance, not a sim action.
  const tip =
    bidTooLowPenaltySol > 0 && onGoToPenalty ? (
      <button
        className="text-xs text-destructive hover:underline text-left"
        onClick={onGoToPenalty}
      >
        See bid-too-low penalty calculation →
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
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}
      <table className="w-full max-w-[34rem]">
        <tbody>
          {/* Receipt-slip layout: col1 carries PMPE rates only, col2 SOL */}
          {/* amounts only. Each unit kind lives in its own column. Each */}
          {/* sub-cost gets its own section header so a reader can scan */}
          {/* by "where each number came from". The result row echoes the */}
          {/* rate so multiplication reads left → right on one line. */}
          <SectionHeader title="Activated stake cost" col1Unit="PMPE" />
          <CalcRow label="Activated Marinade stake" col2={stake(m.stake)} />
          <CalcRow
            label="× Effective bid"
            help="The PMPE rate every winner pays this epoch (last-price auction)."
            col1={pmpe(m.effBid)}
          />
          <CalcRow
            label="= Activated stake cost"
            col1={pmpe(m.effBid)}
            col2={cost(m.cost)}
            bold
            separator
          />

          <SectionHeader title="Activating stake cost" col1Unit="PMPE" />
          <CalcRow label="Activating stake" col2={stake(m.activating)} />
          <CalcRow
            label="× Activating-stake bid"
            help="The PMPE rate applied to newly-activating stake."
            col1={pmpe(m.activatingStakePmpe)}
          />
          <CalcRow
            label="= Activating stake cost"
            col1={pmpe(m.activatingStakePmpe)}
            col2={cost(m.activatingCost)}
            bold
            separator
          />

          <SectionHeader
            title="Penalties"
            help="Extra charges on top of the bid cost. Each one fires for a specific reason: dropping your bid below what you previously committed, sitting on Marinade's blacklist while holding stake, or letting the bond fall below its required floor."
          />
          <CalcRow
            label="Bid-too-low penalty"
            help="Charged when you drop your bid this epoch and your bond doesn't cover what you previously promised stakers."
            col2={bidTooLowPenaltySol > 0 ? pay(bidTooLowPenaltySol, 3) : '—'}
          />
          <CalcRow
            label="Blacklist penalty"
            help="Charged the first epoch your validator gets added to Marinade's blacklist."
            col2={blacklistPenaltySol > 0 ? pay(blacklistPenaltySol, 3) : '—'}
          />
          <CalcRow
            label="Bond risk fee"
            help="Charged when your claimable bond drops below the trigger threshold. Some stake also gets pulled back alongside the fee."
            col2={bondRiskFeeSol > 0 ? pay(bondRiskFeeSol, 3) : '—'}
          />
          {psrEstimates.length > 0 && (
            <>
              <SectionHeader
                title="PSR settlements — estimated"
                help="Payouts to stakers when commission rose unexpectedly, uptime dropped, or rewards fell short of what was promised. Each row says where the money comes from — your bond or Marinade's own pool."
              />
              {psrEstimates.map((estimate, i) => {
                const label = isProtectedEvent(estimate.reason)
                  ? selectProtectedStakeReason(estimate)
                  : estimate.reason
                return (
                  <CalcRow
                    key={i}
                    label={String(label)}
                    col1={
                      estimate.meta.funder === 'ValidatorBond'
                        ? 'from bond'
                        : 'from Marinade backstop'
                    }
                    col2={pay(selectAmount(estimate), 3)}
                  />
                )
              })}
            </>
          )}
          <CalcRow label="Total payment" col2={pay(total, 3)} total />
        </tbody>
      </table>
    </CalcCard>
  )
}

import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatPercentage, pay, pmpe, stake } from 'src/format'
import { computeBidPenaltyMetrics } from 'src/services/breakdowns'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

type Props = {
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  isSimulated?: boolean
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <tr>
    <td
      colSpan={3}
      className="pt-4 pb-1 text-xs uppercase tracking-wider text-muted-foreground border-b border-dashed border-border"
    >
      {title}
    </td>
  </tr>
)

const Row: React.FC<{
  label: string
  secondary?: string
  value: string
  bold?: boolean
  large?: boolean
  accent?: 'red'
}> = ({ label, secondary, value, bold, large, accent }) => (
  <tr className="border-b border-border-grid/50 last:border-0">
    <td
      className={`py-1.5 pr-2 text-xs ${bold ? 'font-semibold' : ''} ${large ? 'text-[13px]' : ''}`}
    >
      {label}
    </td>
    <td className="py-1.5 px-2 text-right font-mono text-xs text-muted-foreground">
      {secondary ?? ''}
    </td>
    <td
      className={`py-1.5 pl-2 text-right font-mono ${large ? 'text-sm' : 'text-xs'} ${
        bold ? 'font-semibold' : ''
      } ${accent === 'red' ? 'text-destructive' : ''}`}
    >
      {value}
    </td>
  </tr>
)

const OkRow: React.FC<{ message: string }> = ({ message }) => (
  <tr>
    <td colSpan={2} className="py-1.5 pr-2 text-xs text-muted-foreground">
      {message}
    </td>
    <td className="py-1.5 pl-2 text-right font-mono text-xs text-[var(--status-green,#2aa198)]">
      ●
    </td>
  </tr>
)

export const BidPenaltyBreakdown: React.FC<Props> = ({
  validator,
  dsSamConfig,
  winningTotalPmpe,
  isSimulated,
}) => {
  const m = computeBidPenaltyMetrics(validator, dsSamConfig, winningTotalPmpe)
  const penaltySol = (m.penaltyPmpe / 1000) * m.marinadeActivatedStakeSol

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
        {isSimulated && (
          <span className="text-[var(--status-yellow,#b58900)]">
            Simulated ·
          </span>
        )}
        Bid Too Low Penalty
        <HelpTip text="Triggered when this epoch's bid drops below 99.999% of last epoch's bid. Penalty scales with shortfall against the worst historical effective participating bid (clipped to bond obligation)." />
      </h3>

      <div
        className={`rounded-lg px-3 py-2 text-sm mb-4 ${
          m.penaltyPmpe > 0
            ? 'bg-destructive-light text-destructive'
            : 'bg-primary-light text-primary'
        }`}
      >
        {m.penaltyPmpe > 0
          ? `Penalty active: ${pmpe(m.penaltyPmpe)} PMPE this epoch.`
          : m.isNegativeBiddingChange
            ? 'Bid dropped this epoch but bond obligation covers it — no penalty.'
            : 'Bid did not decrease — no penalty.'}
      </div>

      <table className="w-full">
        <tbody>
          <SectionHeader title="Bid history" />
          <Row label="Last epoch bid PMPE" value={pmpe(m.lastEpochBidPmpe)} />
          <Row label="This epoch bid PMPE" value={pmpe(m.thisEpochBidPmpe)} />
          <Row
            label="History window"
            secondary={`${m.historyEpochs} epochs`}
            value=""
          />
          <Row
            label="Worst historical effective participating bid PMPE"
            value={pmpe(m.worstHistoricalPmpe)}
          />

          <SectionHeader title="Threshold" />
          <Row
            label="Effective participating bid PMPE"
            value={pmpe(m.effParticipatingBidPmpe)}
          />
          <Row label="Limit (min of above two)" value={pmpe(m.limit)} />
          <Row
            label="Adjusted limit (after permitted deviation)"
            value={pmpe(m.adjustedLimit)}
          />
          <Row
            label="Bond obligation PMPE"
            value={pmpe(m.bondObligationPmpe)}
          />
          <Row label="Shortfall" value={pmpe(m.shortfall)} bold />

          <SectionHeader title="Penalty" />
          <Row
            label="Penalty coefficient"
            secondary={formatPercentage(m.penaltyCoef, 2)}
            value=""
          />
          <Row
            label="Base (winning PMPE + effective participating bid PMPE)"
            value={pmpe(m.base)}
          />
          <Row
            label="Penalty PMPE"
            value={pmpe(m.penaltyPmpe)}
            bold
            accent={m.penaltyPmpe > 0 ? 'red' : undefined}
          />
          {penaltySol > 0 ? (
            <Row
              label="Penalty this epoch"
              secondary={stake(m.marinadeActivatedStakeSol)}
              value={pay(penaltySol)}
              bold
              large
              accent="red"
            />
          ) : (
            <OkRow message="No penalty deducted this epoch." />
          )}
        </tbody>
      </table>
    </div>
  )
}

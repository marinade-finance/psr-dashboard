import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { pay, pmpe, stake } from 'src/format'
import { computeBondCoverageMetrics } from 'src/services/breakdowns'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { BondHealthState } from 'src/services/breakdowns'

type Props = {
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  bondState: BondHealthState
  isSimulated?: boolean
}

const statusLine = (
  state: BondHealthState,
  topUpToMin: number,
  topUpToIdeal: number,
): { label: string; tone: 'red' | 'yellow' | 'green' } => {
  if (state === 'critical') {
    return {
      label:
        topUpToMin > 0
          ? `Penalty imminent. Top up ${pay(topUpToMin)} to avoid it.`
          : 'Penalty imminent. Top up to avoid it.',
      tone: 'red',
    }
  }
  if (state === 'watch') {
    return {
      label:
        topUpToIdeal > 0
          ? `Bond covers current stake. Top up ${pay(topUpToIdeal)} for more stake.`
          : 'Bond covers current stake. Top up for more stake.',
      tone: 'yellow',
    }
  }
  return {
    label: 'Bond has enough coverage. Keep it topped up.',
    tone: 'green',
  }
}

const Row: React.FC<{
  label: string
  qty?: string
  value: string
  bold?: boolean
  large?: boolean
  accent?: 'red' | 'yellow'
}> = ({ label, qty, value, bold, large, accent }) => (
  <tr className="border-b border-border-grid/50 last:border-0">
    <td
      className={`py-1.5 pr-2 text-xs ${bold ? 'font-semibold' : ''} ${large ? 'text-[13px]' : ''}`}
    >
      {label}
    </td>
    <td className="py-1.5 px-2 text-right font-mono text-xs text-muted-foreground">
      {qty ?? ''}
    </td>
    <td
      className={`py-1.5 pl-2 text-right font-mono ${large ? 'text-sm' : 'text-xs'} ${
        bold ? 'font-semibold' : ''
      } ${
        accent === 'red'
          ? 'text-destructive'
          : accent === 'yellow'
            ? 'text-[var(--status-yellow,#b58900)]'
            : ''
      }`}
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

export const BondCoverageBreakdown: React.FC<Props> = ({
  validator,
  dsSamConfig,
  winningTotalPmpe,
  bondState,
  isSimulated,
}) => {
  const m = computeBondCoverageMetrics(
    validator,
    dsSamConfig.minBondEpochs,
    dsSamConfig.idealBondEpochs,
    winningTotalPmpe,
    dsSamConfig.bondRiskFeeMult,
  )
  const status = statusLine(bondState, m.topUpToMin, m.topUpToIdeal)
  const toneBg = {
    red: 'bg-destructive-light text-destructive',
    yellow:
      'bg-[var(--status-yellow-light,rgba(181,137,0,0.12))] text-[var(--status-yellow,#b58900)]',
    green: 'bg-primary-light text-primary',
  }[status.tone]

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
        {isSimulated && (
          <span className="text-[var(--status-yellow,#b58900)]">
            Simulated ·
          </span>
        )}
        Bond Coverage Calculation
        <HelpTip text="Mirrors the SDK fee-trigger threshold: claimable bond ≥ minUnprotectedReserve + projectedExposed × minBondPmpe / 1000. The two sections show coverage at minimum (penalty floor) and ideal (capacity for more stake) horizons." />
      </h3>
      <div className={`rounded-lg px-3 py-2 text-sm mb-4 ${toneBg}`}>
        {status.label}
      </div>

      <table className="w-full">
        <tbody>
          <SectionHeader title="Rates" />
          <Row
            label="Expected max effective bid PMPE"
            qty={pmpe(m.expectedMaxEffBidPmpe)}
            value=""
          />
          <Row
            label="On-chain distributed rewards PMPE"
            qty={pmpe(m.onchainDistributedPmpe)}
            value=""
          />

          <SectionHeader title={`Minimum Coverage (${m.minEp} epochs)`} />
          <Row
            label="Claimable bond balance"
            value={pay(m.claimableBondBalanceSol)}
            bold
          />
          <Row
            label="Activated Marinade stake"
            qty={stake(m.marinadeActivatedStakeSol)}
            value=""
          />
          <Row
            label="Projected exposed stake"
            qty={stake(m.projectedExposedStakeSol)}
            value=""
          />
          <Row
            label="Minimum unprotected reserve"
            value={pay(m.minUnprotectedReserveSol)}
          />
          <Row
            label="On-chain distributed reserve"
            value={pay(m.onchainBase)}
          />
          <Row label="Minimum bid coverage" value={pay(m.minCoverageBid)} />
          <Row label="Minimum required" value={pay(m.floorBase)} bold />
          {m.topUpToMin > 0 ? (
            <Row
              label="Top-up to minimum coverage"
              value={pay(m.topUpToMin)}
              bold
              large
              accent="red"
            />
          ) : (
            <OkRow message="You have enough bond to cover the minimum." />
          )}

          <SectionHeader title={`Ideal Coverage (${m.idealEp} epochs)`} />
          <Row label="Bond balance" value={pay(m.bondBalanceSol)} bold />
          <Row
            label="Projected exposed stake"
            qty={stake(m.projectedExposedStakeSol)}
            value=""
          />
          <Row
            label="Ideal unprotected reserve"
            value={pay(m.idealUnprotectedReserveSol)}
          />
          <Row
            label="On-chain distributed reserve"
            value={pay(m.onchainBase)}
          />
          <Row label="Ideal bid coverage" value={pay(m.idealCoverageBid)} />
          <Row label="Ideal required" value={pay(m.requiredIdeal)} bold />
          {m.topUpToIdeal > 0 ? (
            <Row
              label="To get more stake, top up"
              value={pay(m.topUpToIdeal)}
              bold
              large
              accent="yellow"
            />
          ) : (
            <OkRow message="Bond has enough coverage to receive more stake." />
          )}
        </tbody>
      </table>
    </div>
  )
}

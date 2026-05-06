import React from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { pay, pmpe, stake } from 'src/format'
import { computeSamRevenueMetrics } from 'src/services/breakdowns'

import type { AugmentedAuctionValidator } from 'src/services/sam'

type Props = {
  validator: AugmentedAuctionValidator
  isSimulated?: boolean
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <tr>
    <td
      colSpan={4}
      className="pt-4 pb-1 text-xs uppercase tracking-wider text-muted-foreground border-b border-dashed border-border"
    >
      {title}
    </td>
  </tr>
)

const Row: React.FC<{
  label: string
  pct?: string
  pmpe?: string
  value: string
  bold?: boolean
  accent?: 'green' | 'red'
}> = ({ label, pct, pmpe: pmpeStr, value, bold, accent }) => (
  <tr className="border-b border-border-grid/50 last:border-0">
    <td className={`py-1.5 pr-2 text-xs ${bold ? 'font-semibold' : ''}`}>
      {label}
    </td>
    <td className="py-1.5 px-2 text-right font-mono text-xs text-muted-foreground">
      {pct ?? ''}
    </td>
    <td className="py-1.5 px-2 text-right font-mono text-xs text-muted-foreground">
      {pmpeStr ?? ''}
    </td>
    <td
      className={`py-1.5 pl-2 text-right font-mono text-xs ${
        bold ? 'font-semibold' : ''
      } ${
        accent === 'green'
          ? 'text-[var(--status-green,#2aa198)]'
          : accent === 'red'
            ? 'text-destructive'
            : ''
      }`}
    >
      {value}
    </td>
  </tr>
)

export const SamRevenueBreakdown: React.FC<Props> = ({
  validator,
  isSimulated,
}) => {
  const m = computeSamRevenueMetrics(validator)
  const deltaAccent = m.delta > 0 ? 'green' : m.delta < 0 ? 'red' : undefined
  const deltaText =
    m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${stake(m.delta)}`

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
        {isSimulated && (
          <span className="text-[var(--status-yellow,#b58900)]">
            Simulated ·
          </span>
        )}
        SAM Revenue Breakdown
        <HelpTip text="Per-component breakdown of effective bid (PMPE) and the SOL cost per epoch on active and activating stake." />
      </h3>
      {m.overrideMsg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-secondary text-secondary-foreground">
          {m.overrideMsg}
        </div>
      )}

      <table className="w-full">
        <tbody>
          <SectionHeader title="Stake" />
          <Row label="Active SAM stake" value={stake(m.active)} bold />
          <Row label="SAM target" value={stake(m.target)} />
          <Row
            label="Expected next-epoch Δ"
            value={deltaText}
            accent={deltaAccent}
          />

          <SectionHeader title="Commissions" />
          <Row
            label="Inflation"
            pct={m.inflPct}
            pmpe={pmpe(m.inflPmpe)}
            value=""
          />
          <Row label="MEV" pct={m.mevPct} pmpe={pmpe(m.mevPmpe)} value="" />
          <Row
            label="Block rewards"
            pct={m.blkPct}
            pmpe={pmpe(m.blkPmpe)}
            value=""
          />

          <SectionHeader title="Bid" />
          <Row label="Stake bid PMPE" pmpe={pmpe(m.bid)} value="" />
          <Row
            label="Auction effective bid PMPE"
            pmpe={pmpe(m.effBid)}
            value=""
            bold
          />

          <SectionHeader title="Cost" />
          <Row label="Active stake cost" value={pay(m.cost)} />
          {m.activating > 0 && (
            <Row
              label={`Activating stake cost (${stake(m.activating)})`}
              value={pay(m.activatingCost)}
            />
          )}
          <Row label="Total per epoch" value={pay(m.total)} bold />
        </tbody>
      </table>
    </div>
  )
}

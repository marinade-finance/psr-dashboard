import React, { useState } from 'react'

import { Color } from 'src/components/table/table'
import { formatPercentage, formatSolAmount } from 'src/format'
import {
  bondHealthColor,
  bondTooltip,
  getRecommendation,
  isoToFlag,
  selectBondUtilization,
  selectMaxAPY,
  selectSamActiveStake,
  selectSamTargetStake,
  selectStakeDelta,
} from 'src/services/sam'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { ValidatorMeta } from 'src/components/sam-table/sam-table'

type Props = {
  validator: AuctionValidator
  meta: ValidatorMeta | undefined
  epochsPerYear: number
  isExpert: boolean
  onBack: () => void
  onEdit?: () => void
}

function bondDotColor(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'bg-green-400'
    case Color.YELLOW:
      return 'bg-yellow-400'
    case Color.RED:
      return 'bg-red-400'
    default:
      return 'bg-muted-foreground'
  }
}

function bondLabel(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'Healthy'
    case Color.YELLOW:
      return 'Watch'
    case Color.RED:
      return 'Low'
    default:
      return 'None'
  }
}

function bondProgressColor(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'bg-green-400'
    case Color.YELLOW:
      return 'bg-yellow-400'
    case Color.RED:
      return 'bg-red-400'
    default:
      return 'bg-muted-foreground'
  }
}

function bondCardBorder(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'border-green-500/40'
    case Color.YELLOW:
      return 'border-yellow-500/40'
    case Color.RED:
      return 'border-red-500/40'
    default:
      return 'border-border'
  }
}

function bondHealthTextColor(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'text-green-400'
    case Color.YELLOW:
      return 'text-yellow-400'
    case Color.RED:
      return 'text-red-400'
    default:
      return 'text-muted-foreground'
  }
}

function severityBorderClass(severity: string): string {
  switch (severity) {
    case 'positive':
      return 'border-l-4 border-l-green-500'
    case 'warning':
      return 'border-l-4 border-l-yellow-500'
    case 'critical':
      return 'border-l-4 border-l-red-500'
    default:
      return 'border-l-4 border-l-blue-500'
  }
}

function epochsLabel(n: number): string {
  if (n === Infinity || n > 999) return '\u221e epochs covered'
  const rounded = Math.floor(n)
  return `~${rounded} epoch${rounded !== 1 ? 's' : ''} covered`
}

export function SamDetail({
  validator,
  meta,
  epochsPerYear,
  isExpert,
  onBack,
  onEdit,
}: Props): JSX.Element {
  const [copied, setCopied] = useState(false)

  const bondColor = bondHealthColor(validator)
  const recommendation = getRecommendation(validator, bondColor)
  const delta = selectStakeDelta(validator)
  const maxApy = selectMaxAPY(validator, epochsPerYear)
  const bondUtil = selectBondUtilization(validator)
  const activeStake = selectSamActiveStake(validator)
  const targetStake = selectSamTargetStake(validator)

  const flag = meta?.countryIso ? isoToFlag(meta.countryIso) : null
  const name = meta?.name ?? validator.voteAccount
  const rank = meta?.rank

  const { revShare } = validator
  const bondBalance = validator.bondBalanceSol ?? 0

  function copyPubkey() {
    void navigator.clipboard.writeText(validator.voteAccount).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const deltaColor =
    delta > 0
      ? 'text-green-400'
      : delta < 0
        ? 'text-red-400'
        : 'text-muted-foreground'

  const apyTooltip = [
    `Inflation: ${formatPercentage(revShare.inflationPmpe / 1000, 4)} / epoch`,
    `MEV: ${formatPercentage(revShare.mevPmpe / 1000, 4)} / epoch`,
    `Block: ${formatPercentage(revShare.blockPmpe / 1000, 4)} / epoch`,
    `Bid: \u2609${formatSolAmount(revShare.auctionEffectiveBidPmpe, 4)}`,
  ].join('\n')

  return (
    <div className="p-4">
      {/* Back button */}
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 bg-card border border-border rounded-md text-muted-foreground text-sm cursor-pointer hover:border-primary hover:text-foreground transition-colors"
        onClick={onBack}
      >
        \u2190 Back to list
      </button>

      {/* Header row */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground flex-1 min-w-0 truncate">
          {flag && <span className="mr-1">{flag}</span>}
          {name}
        </h1>
        {rank != null && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-alpha border border-primary text-primary text-xs font-semibold">
            #{rank}
          </span>
        )}
      </div>

      {/* Pubkey click-to-copy */}
      <div className="mb-6 flex items-center gap-2">
        <span
          className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-muted-foreground hover:underline select-none"
          onClick={copyPubkey}
          title="Click to copy"
        >
          {validator.voteAccount}
        </span>
        {copied && <span className="text-green-400 text-xs">Copied!</span>}
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {/* Max APY */}
        <div
          className="flex-1 min-w-40 bg-card border border-border-grid rounded-lg p-4 flex flex-col gap-1.5"
          title={apyTooltip}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Max APY
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatPercentage(maxApy, 2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPercentage(revShare.totalPmpe / 1000, 4)} / epoch
          </div>
        </div>

        {/* Bond health */}
        <div
          className={`flex-1 min-w-40 bg-card border rounded-lg p-4 flex flex-col gap-1.5 ${bondCardBorder(bondColor)}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bond Health
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bondDotColor(bondColor)}`}
            />
            <span className="text-lg font-bold text-foreground">
              {bondLabel(bondColor)}
            </span>
          </div>
          <div className="text-sm text-secondary-foreground">
            \u2609 {formatSolAmount(bondBalance, 2)} SOL
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${bondProgressColor(bondColor)}`}
              style={{ width: `${bondUtil * 100}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {epochsLabel(validator.bondGoodForNEpochs)}
          </div>
        </div>

        {/* Stake \u0394 */}
        <div className="flex-1 min-w-40 bg-card border border-border-grid rounded-lg p-4 flex flex-col gap-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stake \u0394
          </div>
          <div className={`text-2xl font-bold ${deltaColor}`}>
            {delta > 0 ? '\u2191 +' : delta < 0 ? '\u2193 ' : '\u2014 '}
            {formatSolAmount(Math.abs(delta), 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            Target: \u2609 {formatSolAmount(targetStake, 0)}
          </div>
        </div>
      </div>

      {/* Detail columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* APY breakdown */}
        <div className="bg-card border border-border-grid rounded-lg p-4 flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border-grid">
            APY Breakdown
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Inflation</span>
            <span className="text-xs text-secondary-foreground font-medium">
              {formatPercentage(revShare.inflationPmpe / 1000, 4)} / epoch
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">MEV</span>
            <span className="text-xs text-secondary-foreground font-medium">
              {formatPercentage(revShare.mevPmpe / 1000, 4)} / epoch
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Block rewards</span>
            <span className="text-xs text-secondary-foreground font-medium">
              {formatPercentage(revShare.blockPmpe / 1000, 4)} / epoch
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2 border-t border-border-grid pt-1.5">
            <span className="text-xs text-muted-foreground font-semibold">
              Effective bid
            </span>
            <span className="text-xs text-foreground font-semibold">
              {formatPercentage(revShare.auctionEffectiveBidPmpe / 1000, 4)} /
              epoch
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">
              Infl. commission
            </span>
            <span className="text-xs text-secondary-foreground font-medium">
              {formatPercentage(validator.inflationCommissionDec, 0)}
            </span>
          </div>
          {validator.mevCommissionDec != null && (
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-muted-foreground">
                MEV commission
              </span>
              <span className="text-xs text-secondary-foreground font-medium">
                {formatPercentage(validator.mevCommissionDec, 0)}
              </span>
            </div>
          )}
        </div>

        {/* Bond health details */}
        <div className="bg-card border border-border-grid rounded-lg p-4 flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border-grid">
            Bond Health
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Balance</span>
            <span className="text-xs text-secondary-foreground font-medium">
              \u2609 {formatSolAmount(bondBalance, 2)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">
              Epochs covered
            </span>
            <span className="text-xs text-secondary-foreground font-medium">
              {epochsLabel(validator.bondGoodForNEpochs)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Health label</span>
            <span
              className={`text-xs font-semibold ${bondHealthTextColor(bondColor)}`}
            >
              {bondLabel(bondColor)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed mt-1 p-2 bg-muted rounded">
            {bondTooltip(bondColor) ||
              'No active stake \u2014 bond health not applicable.'}
          </div>
        </div>

        {/* Stake movement */}
        <div className="bg-card border border-border-grid rounded-lg p-4 flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border-grid">
            Stake Movement
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <span className="text-xs text-secondary-foreground font-medium">
              \u2609 {formatSolAmount(activeStake, 0)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Target</span>
            <span className="text-xs text-secondary-foreground font-medium">
              \u2609 {formatSolAmount(targetStake, 0)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Delta</span>
            <span className={`text-xs font-semibold ${deltaColor}`}>
              {delta > 0 ? '+' : ''}
              {formatSolAmount(delta, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation box */}
      <div
        className={`border border-border rounded-lg p-4 mb-6 bg-card flex flex-col gap-1.5 ${severityBorderClass(recommendation.severity)}`}
      >
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          NEXT STEP
        </div>
        <div className="text-sm text-secondary-foreground leading-relaxed">
          {recommendation.text}
        </div>
      </div>

      {/* Expert-only simulation CTA */}
      {isExpert && onEdit && (
        <div className="flex items-center justify-between gap-4 flex-wrap bg-background border border-primary rounded-lg p-4">
          <span className="text-sm text-muted-foreground flex-1">
            Simulate how changes to commission or bid affect this
            validator&apos;s position in the auction.
          </span>
          <button
            className="px-4 py-2 bg-primary hover:brightness-110 rounded-md text-primary-foreground text-sm font-semibold cursor-pointer transition-colors flex-shrink-0"
            onClick={onEdit}
          >
            Open Simulation
          </button>
        </div>
      )}
    </div>
  )
}

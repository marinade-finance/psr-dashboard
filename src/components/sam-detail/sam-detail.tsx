import React, { useState } from 'react'

import { Color } from 'src/components/table/table'
import { formatPercentage, formatSolAmount } from 'src/format'
import {
  bondHealthColor,
  bondTooltip,
  getRecommendation,
  isoToFlag,
  selectConstraintText,
  selectIsNonProductive,
  selectMaxAPY,
  selectStakeDelta,
} from 'src/services/sam'

import styles from './sam-detail.module.css'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

type Props = {
  validator: AuctionValidator
  name: string
  countryIso: string | null
  rank: number
  totalCount: number
  epochsPerYear: number
  onBack: () => void
  onEnterSimulation: () => void
}

function bondProgressClass(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return styles.bondProgressHealthy
    case Color.YELLOW:
      return styles.bondProgressWatch
    case Color.RED:
      return styles.bondProgressLow
    default:
      return styles.bondProgressNone
  }
}

function bondCardClass(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return styles.summaryCardHealthy
    case Color.YELLOW:
      return styles.summaryCardWatch
    case Color.RED:
      return styles.summaryCardLow
    default:
      return styles.summaryCardNone
  }
}

function bondEpochsLabel(bondGoodForNEpochs: number): string {
  if (bondGoodForNEpochs === Infinity || bondGoodForNEpochs > 999) {
    return '∞ epochs covered'
  }
  const n = Math.floor(bondGoodForNEpochs)
  return `~${n} epoch${n !== 1 ? 's' : ''} covered`
}

function stakeDeltaValue(delta: number): string {
  if (delta === 0) return '0 SOL'
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${formatSolAmount(delta, 0)} SOL`
}

export function SamDetail({
  validator,
  name,
  countryIso,
  rank,
  totalCount,
  epochsPerYear,
  onBack,
  onEnterSimulation,
}: Props): JSX.Element {
  const [copied, setCopied] = useState(false)

  const bondColor = bondHealthColor(validator)
  const recommendation = getRecommendation(validator, bondColor)
  const isNonProductive = selectIsNonProductive(validator)
  const delta = selectStakeDelta(validator)
  const maxApy = selectMaxAPY(validator, epochsPerYear)
  const constraintText = selectConstraintText(validator)

  const bondBalance = validator.bondBalanceSol ?? 0
  const targetStake = validator.auctionStake.marinadeSamTargetSol
  const activeStake = validator.marinadeActivatedStakeSol

  // Bond utilization: bondBalance / (bondBalance + some buffer) capped 0-1
  // Use bondSamHealth as the fractional utilization [0,1]
  const bondUtilPct = Math.min(1, Math.max(0, validator.bondSamHealth ?? 0))

  const { revShare } = validator

  function copyPubkey() {
    void navigator.clipboard.writeText(validator.voteAccount).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const flag = countryIso ? isoToFlag(countryIso) : null
  const displayName = flag ? `${flag} ${name}` : name

  return (
    <div>
      {/* Back button */}
      <button className={styles.backBtn} onClick={onBack}>
        ← Back to list
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.validatorName}>
          {displayName}
          {isNonProductive && (
            <span
              style={{
                display: 'inline-block',
                marginLeft: 10,
                padding: '2px 8px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 4,
                fontSize: 12,
                color: '#f87171',
                verticalAlign: 'middle',
              }}
            >
              non-productive
            </span>
          )}
        </span>
        <span className={styles.rankBadge}>
          #{rank} of {totalCount}
        </span>
      </div>

      {/* Pubkey click-to-copy */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          className={styles.pubkey}
          onClick={copyPubkey}
          title="Click to copy"
        >
          {validator.voteAccount}
        </span>
        {copied && <span className={styles.copiedFeedback}>Copied</span>}
      </div>

      {/* Summary cards */}
      <div className={styles.summaryCards}>
        {/* Max APY */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardLabel}>Max APY</div>
          <div className={styles.summaryCardValue}>
            {formatPercentage(maxApy, 2)}
          </div>
          <div className={styles.summaryCardSub}>
            {formatPercentage(revShare.totalPmpe / 1000, 4)} / epoch
          </div>
        </div>

        {/* Bond */}
        <div className={`${styles.summaryCard} ${bondCardClass(bondColor)}`}>
          <div className={styles.summaryCardLabel}>Bond Balance</div>
          <div className={styles.summaryCardValue}>
            {bondBalance != null
              ? `${formatSolAmount(bondBalance, 2)} SOL`
              : '—'}
          </div>
          <div className={styles.summaryCardSub}>
            {bondEpochsLabel(validator.bondGoodForNEpochs)}
          </div>
        </div>

        {/* Stake delta */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardLabel}>Stake Δ (Next Epoch)</div>
          <div
            className={styles.summaryCardValue}
            style={{
              color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#94a3b8',
            }}
          >
            {stakeDeltaValue(delta)}
          </div>
          <div className={styles.summaryCardSub}>
            Target: {formatSolAmount(targetStake, 0)} SOL
          </div>
        </div>
      </div>

      {/* Detail columns */}
      <div className={styles.detailGrid}>
        {/* APY breakdown */}
        <div className={styles.detailCol}>
          <div className={styles.detailColTitle}>APY Breakdown</div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Inflation share</span>
            <span className={styles.detailRowValue}>
              {formatPercentage(revShare.inflationPmpe / 1000, 4)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>MEV share</span>
            <span className={styles.detailRowValue}>
              {formatPercentage(revShare.mevPmpe / 1000, 4)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Bid (effective)</span>
            <span className={styles.detailRowValue}>
              {formatPercentage(revShare.auctionEffectiveBidPmpe / 1000, 4)}
            </span>
          </div>
          <div
            className={styles.detailRow}
            style={{
              borderTop: '1px solid rgba(148,163,184,0.1)',
              paddingTop: 6,
              marginTop: 2,
            }}
          >
            <span
              className={styles.detailRowLabel}
              style={{ fontWeight: 600, color: '#94a3b8' }}
            >
              Total
            </span>
            <span
              className={styles.detailRowValue}
              style={{ fontWeight: 600, color: '#e2e8f0' }}
            >
              {formatPercentage(revShare.totalPmpe / 1000, 4)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Inflation commission</span>
            <span className={styles.detailRowValue}>
              {formatPercentage(validator.inflationCommissionDec, 0)}
            </span>
          </div>
          {validator.mevCommissionDec != null && (
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>MEV commission</span>
              <span className={styles.detailRowValue}>
                {formatPercentage(validator.mevCommissionDec, 0)}
              </span>
            </div>
          )}
        </div>

        {/* Bond health */}
        <div className={styles.detailCol}>
          <div className={styles.detailColTitle}>Bond Health</div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Balance</span>
            <span className={styles.detailRowValue}>
              {bondBalance != null
                ? `${formatSolAmount(bondBalance, 2)} SOL`
                : '—'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Epochs covered</span>
            <span className={styles.detailRowValue}>
              {bondEpochsLabel(validator.bondGoodForNEpochs)}
            </span>
          </div>
          {/* Progress bar: bondSamHealth as utilization proxy */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#475569',
                marginBottom: 4,
              }}
            >
              <span>Health</span>
              <span>{Math.round(bondUtilPct * 100)}%</span>
            </div>
            <div className={styles.bondProgress}>
              <div
                className={`${styles.bondProgressFill} ${bondProgressClass(bondColor)}`}
                style={{ width: `${bondUtilPct * 100}%` }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.5,
              marginTop: 4,
              padding: '8px 10px',
              background: 'rgba(148,163,184,0.04)',
              borderRadius: 4,
            }}
          >
            {bondTooltip(bondColor) ||
              'No active stake — bond health not applicable.'}
          </div>
        </div>

        {/* Stake movement */}
        <div className={styles.detailCol}>
          <div className={styles.detailColTitle}>Stake Movement</div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Active stake</span>
            <span className={styles.detailRowValue}>
              {formatSolAmount(activeStake, 0)} SOL
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Target stake</span>
            <span className={styles.detailRowValue}>
              {formatSolAmount(targetStake, 0)} SOL
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailRowLabel}>Delta</span>
            <span
              className={styles.detailRowValue}
              style={{
                color:
                  delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#94a3b8',
              }}
            >
              {stakeDeltaValue(delta)}
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#94a3b8',
              marginTop: 8,
              padding: '8px 10px',
              background: 'rgba(148,163,184,0.04)',
              borderRadius: 4,
              borderLeft: '2px solid rgba(148,163,184,0.15)',
            }}
          >
            {constraintText}
          </div>
        </div>
      </div>

      {/* Recommendation box */}
      <div className={styles.recommendationBox}>
        <div className={styles.recommendationLabel}>Recommendation</div>
        <div className={styles.recommendationText}>{recommendation.text}</div>
      </div>

      {/* Simulation CTA */}
      <div className={styles.simulationCta}>
        <span className={styles.simulationCtaText}>
          Simulate how changes to commission or bid affect this validator's
          position in the auction.
        </span>
        <button className={styles.simulationCtaBtn} onClick={onEnterSimulation}>
          Open Simulation
        </button>
      </div>
    </div>
  )
}

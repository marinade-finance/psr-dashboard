import React, { useEffect, useMemo, useRef, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatPercentage, formatSolAmount } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'
import {
  selectBondSize,
  selectMaxAPY,
  selectSamDistributedStake,
  selectVoteAccount,
  selectWinningAPY,
  selectProjectedAPY,
} from 'src/services/sam'
import {
  getApyBreakdown,
  getBondHealth,
  getBondHealthStyle,
  getValidatorTip,
  getTipStyle,
  calculateBondUtilization,
  formatStakeDelta,
} from 'src/services/tip-engine'

import styles from './sam-table.module.css'

import type { UserLevel } from '../navigation/navigation'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'

// Validator with computed bond state
type ValidatorWithBondState = AuctionValidator & {
  bondHealth: 'healthy' | 'watch' | 'critical'
}

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  simulationModeActive: boolean
  editingValidator: string | null
  simulatedValidator: string | null
  isCalculating: boolean
  hasSimulationApplied: boolean
  pendingEdits: PendingEdits
  onValidatorClick: (voteAccount: string) => void
  onFieldChange: (
    field:
      | 'inflationCommission'
      | 'mevCommission'
      | 'blockRewardsCommission'
      | 'bidPmpe',
    value: string,
  ) => void
  onRunSimulation: () => void
  onCancelEditing: () => void
}

// APY Tooltip component for Max APY hover
const ApyTooltip: React.FC<{
  validator: AuctionValidator
  epochsPerYear: number
}> = ({ validator, epochsPerYear }) => {
  const breakdown = getApyBreakdown(validator, epochsPerYear)
  const inflComm = validator.inflationCommissionDec * 100
  const mevComm =
    validator.mevCommissionDec !== null ? validator.mevCommissionDec * 100 : 0
  const blockComm =
    validator.blockRewardsCommissionDec !== null
      ? validator.blockRewardsCommissionDec * 100
      : 0

  return (
    <div className={styles.apyTooltip}>
      <div className={styles.apyTooltipTitle}>APY Composition</div>
      <div className={styles.apyTooltipRow}>
        <span
          className={styles.apyDot}
          style={{ background: 'var(--chart-1)' }}
        />
        <span className={styles.apyLabel}>Inflation</span>
        <span className={styles.apyNote}>({inflComm.toFixed(0)}% comm.)</span>
        <span className={styles.apyValue}>
          {formatPercentage(breakdown.inflation, 2)}
        </span>
      </div>
      <div className={styles.apyTooltipRow}>
        <span
          className={styles.apyDot}
          style={{ background: 'var(--chart-2)' }}
        />
        <span className={styles.apyLabel}>MEV Tips</span>
        <span className={styles.apyNote}>({mevComm.toFixed(0)}% comm.)</span>
        <span className={styles.apyValue}>
          {formatPercentage(breakdown.mev, 2)}
        </span>
      </div>
      <div className={styles.apyTooltipRow}>
        <span
          className={styles.apyDot}
          style={{ background: 'var(--chart-3)' }}
        />
        <span className={styles.apyLabel}>Block Rewards</span>
        <span className={styles.apyNote}>({blockComm.toFixed(0)}% shared)</span>
        <span className={styles.apyValue}>
          {formatPercentage(breakdown.blockRewards, 2)}
        </span>
      </div>
      <div className={styles.apyTooltipRow}>
        <span
          className={styles.apyDot}
          style={{ background: 'var(--chart-4)' }}
        />
        <span className={styles.apyLabel}>Stake Bid</span>
        <span className={styles.apyNote}>(your bid)</span>
        <span className={styles.apyValue}>
          {formatPercentage(breakdown.stakeBid, 2)}
        </span>
      </div>
      <div className={styles.apyTooltipTotal}>
        <span>Total</span>
        <span>{formatPercentage(breakdown.total, 2)}</span>
      </div>
    </div>
  )
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult: _originalAuctionResult,
  epochsPerYear,
  dsSamConfig,
  level: _level,
  simulationModeActive,
  editingValidator,
  simulatedValidator,
  isCalculating,
  hasSimulationApplied: _hasSimulationApplied,
  pendingEdits: _pendingEdits,
  onValidatorClick,
  onFieldChange: _onFieldChange,
  onRunSimulation: _onRunSimulation,
  onCancelEditing,
}) => {
  const {
    auctionData: { validators },
  } = auctionResult
  const samDistributedStake = Math.round(selectSamDistributedStake(validators))
  const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)
  const projectedApy = selectProjectedAPY(
    auctionResult,
    dsSamConfig,
    epochsPerYear,
  )

  // Ref for click-outside detection
  const tableWrapRef = useRef<HTMLDivElement>(null)

  // Hovered row for APY tooltip
  const [hoveredApyRow, setHoveredApyRow] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Global Escape key handler to cancel editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingValidator) {
        onCancelEditing()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingValidator, onCancelEditing])

  // Click-outside handler to cancel editing
  useEffect(() => {
    if (!editingValidator) return undefined

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tableWrapRef.current &&
        !tableWrapRef.current.contains(e.target as Node)
      ) {
        onCancelEditing()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingValidator, onCancelEditing])

  // Current validators with bond health computed
  const validatorsWithBond: ValidatorWithBondState[] = useMemo(
    () =>
      validators
        .filter(validator => selectBondSize(validator) > 0)
        .map(v => {
          const bondUtilPct = calculateBondUtilization(v)
          const bondRunway = v.bondGoodForNEpochs ?? 0
          return {
            ...v,
            bondHealth: getBondHealth(bondUtilPct, bondRunway),
          }
        }),
    [validators],
  )

  // Sort by SAM target stake descending (rank order)
  const sortedValidators = useMemo(() => {
    return [...validatorsWithBond].sort(
      (a, b) =>
        b.auctionStake.marinadeSamTargetSol -
        a.auctionStake.marinadeSamTargetSol,
    )
  }, [validatorsWithBond])

  // Split into winners and non-winners
  const winningValidators = sortedValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol > 0,
  )
  const nonWinningValidators = sortedValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol === 0,
  )

  // Stats for the stats bar
  const totalValidators = sortedValidators.length
  const winningCount = winningValidators.length

  const stats: {
    label: string
    value: string
    unit: string
    help: string | undefined
  }[] = [
    {
      label: 'Total Auction Stake',
      value: formatSolAmount(samDistributedStake, 0),
      unit: '\u25CE',
      help: undefined,
    },
    {
      label: 'Winning APY',
      value: formatPercentage(winningAPY, 2),
      unit: '',
      help: HELP_TEXT.winningApy,
    },
    {
      label: 'Projected APY',
      value: formatPercentage(projectedApy, 2),
      unit: '',
      help: undefined,
    },
    {
      label: 'Winning Validators',
      value: `${winningCount} / ${totalValidators}`,
      unit: '',
      help: undefined,
    },
  ]

  const renderRow = (validator: ValidatorWithBondState, index: number) => {
    const voteAccount = selectVoteAccount(validator)
    const inSet = validator.auctionStake.marinadeSamTargetSol > 0
    const rank = index + 1
    const isHovered = hoveredRow === voteAccount
    const isSimulated = simulatedValidator === voteAccount

    // Bond health
    const bondUtilPct = calculateBondUtilization(validator)
    const bondRunway = validator.bondGoodForNEpochs ?? 0
    const bondHealth = validator.bondHealth
    const bondStyle = getBondHealthStyle(bondHealth)
    const hasAlert = bondRunway <= 5 || bondUtilPct >= 85

    // Stake delta
    const delta = formatStakeDelta(validator)

    // Tip
    const tip = getValidatorTip(validator, winningAPY, epochsPerYear)
    const tipStyle = getTipStyle(tip.urgency)

    // Max APY
    const maxApy = selectMaxAPY(validator, epochsPerYear)

    return (
      <tr
        key={voteAccount}
        className={`${styles.row} ${!inSet ? styles.rowOutOfSet : ''} ${isHovered ? styles.rowHovered : ''} ${isSimulated ? styles.rowSimulated : ''}`}
        onMouseEnter={() => setHoveredRow(voteAccount)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => onValidatorClick(voteAccount)}
      >
        {/* Rank */}
        <td className={styles.cellRank}>{rank}</td>

        {/* Validator */}
        <td className={styles.cellValidator}>
          <div className={styles.validatorInfo}>
            <span className={styles.validatorName}>
              {voteAccount.slice(0, 8)}...
            </span>
            {hasAlert && <span className={styles.alertDot} />}
          </div>
          <div className={styles.validatorPubkey}>{voteAccount}</div>
        </td>

        {/* Max APY with hover tooltip */}
        <td
          className={styles.cellMaxApy}
          onMouseEnter={e => {
            e.stopPropagation()
            setHoveredApyRow(voteAccount)
          }}
          onMouseLeave={() => setHoveredApyRow(null)}
        >
          <span
            className={`${styles.apyBadge} ${inSet ? styles.apyBadgeInSet : styles.apyBadgeOutOfSet}`}
          >
            {formatPercentage(maxApy, 2)}
          </span>
          {hoveredApyRow === voteAccount && (
            <ApyTooltip validator={validator} epochsPerYear={epochsPerYear} />
          )}
        </td>

        {/* Bond Health */}
        <td className={styles.cellBond}>
          <div className={styles.bondRow}>
            <span
              className={styles.bondBadge}
              style={{ background: bondStyle.bg, color: bondStyle.color }}
            >
              <span
                className={styles.bondDot}
                style={{ background: bondStyle.color }}
              />
              {bondStyle.label}
            </span>
            <span className={styles.bondBalance}>
              {formatSolAmount(selectBondSize(validator), 0)}\u25CE
            </span>
          </div>
          <div className={styles.bondRow}>
            <div className={styles.bondUtilBar}>
              <div
                className={styles.bondUtilFill}
                style={{
                  width: `${Math.min(bondUtilPct, 100)}%`,
                  background: bondStyle.color,
                }}
              />
            </div>
            <span
              className={styles.bondRunway}
              style={{
                color: bondRunway <= 10 ? bondStyle.color : 'var(--muted)',
              }}
            >
              ~{Math.round(bondRunway)}ep
            </span>
          </div>
        </td>

        {/* Stake Delta */}
        <td className={styles.cellDelta}>
          <span className={styles.deltaValue} style={{ color: delta.color }}>
            {delta.arrow} {delta.text}
            {delta.text !== '\u2014' && ' \u25CE'}
          </span>
        </td>

        {/* Next Step */}
        <td className={styles.cellNextStep}>
          <div
            className={styles.tipBadge}
            style={{ background: tipStyle.bg, color: tipStyle.color }}
          >
            <span className={styles.tipIcon}>{tipStyle.icon}</span>
            <span className={styles.tipText}>{tip.text}</span>
          </div>
        </td>

        {/* Chevron */}
        <td className={styles.cellChevron}>
          <div
            className={`${styles.chevronBtn} ${isHovered ? styles.chevronBtnHovered : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4.5 3L7.5 6L4.5 9"
                stroke={isHovered ? 'var(--primary)' : 'var(--muted)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div
      ref={tableWrapRef}
      className={`${styles.tableWrap} ${simulationModeActive ? styles.simulationModeActive : ''} ${isCalculating ? styles.calculating : ''}`}
    >
      {/* Stats Bar */}
      <div className={styles.statsBar}>
        {stats.map(stat => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statLabel}>
              {stat.label}
              {stat.help && <HelpTip text={stat.help} />}
            </div>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>{stat.value}</span>
              {stat.unit && (
                <span className={styles.statUnit}>{stat.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerRank}>#</th>
              <th className={styles.headerValidator}>Validator</th>
              <th className={styles.headerMaxApy}>
                Max APY
                <HelpTip text={HELP_TEXT.maxApy} />
              </th>
              <th className={styles.headerBond}>
                Bond
                <HelpTip text={HELP_TEXT.bondHealth} />
              </th>
              <th className={styles.headerDelta}>
                Stake \u0394
                <HelpTip text={HELP_TEXT.stakeDelta} />
              </th>
              <th className={styles.headerNextStep}>Next Step</th>
              <th className={styles.headerChevron}></th>
            </tr>
          </thead>
          <tbody>
            {winningValidators.map((v, i) => renderRow(v, i))}

            {/* Winning Set Cutoff Divider */}
            {nonWinningValidators.length > 0 && (
              <tr className={styles.cutoffRow}>
                <td colSpan={7}>
                  <div className={styles.cutoffBanner}>
                    <div className={styles.cutoffLeft}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 2L10 6H14L11 9L12 13L8 10.5L4 13L5 9L2 6H6L8 2Z"
                          fill="var(--primary)"
                          opacity="0.8"
                        />
                      </svg>
                      <span className={styles.cutoffLabel}>
                        Winning Set Cutoff
                      </span>
                    </div>
                    <div className={styles.cutoffLine} />
                    <span className={styles.cutoffApy}>
                      Winning APY: {formatPercentage(winningAPY, 2)}
                    </span>
                    <div className={styles.cutoffLine} />
                    <span className={styles.cutoffCount}>
                      {winningCount} of {totalValidators} validators
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {nonWinningValidators.map((v, i) => renderRow(v, winningCount + i))}
          </tbody>
        </table>
      </div>

      {/* Pulse animation */}
      <style>
        {'@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }'}
      </style>
    </div>
  )
}

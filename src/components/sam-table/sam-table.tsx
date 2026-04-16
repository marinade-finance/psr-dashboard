import React, { useMemo, useRef, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table'
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

import type { UserLevel } from '../navigation/navigation'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'

export type ValidatorMeta = {
  name?: string
  countryIso?: string | null
  rank?: number
}

// Validator with computed bond state
type ValidatorWithBondState = AuctionValidator & {
  bondHealth: 'healthy' | 'watch' | 'critical'
}

type SortColumn =
  | 'rank'
  | 'validator'
  | 'maxApy'
  | 'bond'
  | 'stakeDelta'
  | 'nextStep'
type SortDirection = 'asc' | 'desc'

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  simulatedValidator: string | null
  isCalculating: boolean
  // Extra props passed by sam.tsx (accepted but unused in this view)
  tvlJoinApyDiff?: number
  tvlLeaveApyDiff?: number
  backstopDiff?: number
  backstopTvl?: number
  simulationModeActive?: boolean
  editingValidator?: string | null
  hasSimulationApplied?: boolean
  pendingEdits?: PendingEdits
  validatorMeta?: Map<string, ValidatorMeta>
  onValidatorClick: (voteAccount: string) => void
  onFieldChange?: (field: string, value: string) => void
  onRunSimulation?: () => void
  onCancelEditing?: () => void
  onToggleSimulation?: () => void
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
    <div className="absolute top-[-4px] left-[calc(100%-16px)] z-[100] bg-card border border-border rounded-lg px-4 py-3 min-w-[230px] shadow-lg">
      <div className="text-[11px] text-muted-foreground mb-2 font-medium">
        APY Composition
      </div>
      <div className="flex items-center text-xs mb-1 gap-[5px]">
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ background: 'var(--chart-1)' }}
        />
        <span className="text-secondary-foreground">Inflation</span>
        <span className="text-muted-foreground text-[10px] flex-1">
          ({inflComm.toFixed(0)}% comm.)
        </span>
        <span className="text-foreground font-mono font-medium">
          {formatPercentage(breakdown.inflation, 2)}
        </span>
      </div>
      <div className="flex items-center text-xs mb-1 gap-[5px]">
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ background: 'var(--chart-2)' }}
        />
        <span className="text-secondary-foreground">MEV Tips</span>
        <span className="text-muted-foreground text-[10px] flex-1">
          ({mevComm.toFixed(0)}% comm.)
        </span>
        <span className="text-foreground font-mono font-medium">
          {formatPercentage(breakdown.mev, 2)}
        </span>
      </div>
      <div className="flex items-center text-xs mb-1 gap-[5px]">
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ background: 'var(--chart-3)' }}
        />
        <span className="text-secondary-foreground">Block Rewards</span>
        <span className="text-muted-foreground text-[10px] flex-1">
          ({blockComm.toFixed(0)}% shared)
        </span>
        <span className="text-foreground font-mono font-medium">
          {formatPercentage(breakdown.blockRewards, 2)}
        </span>
      </div>
      <div className="flex items-center text-xs mb-1 gap-[5px]">
        <span
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ background: 'var(--chart-4)' }}
        />
        <span className="text-secondary-foreground">Stake Bid</span>
        <span className="text-muted-foreground text-[10px] flex-1">
          (your bid)
        </span>
        <span className="text-foreground font-mono font-medium">
          {formatPercentage(breakdown.stakeBid, 2)}
        </span>
      </div>
      <div className="border-t border-border-grid mt-1.5 pt-1.5 flex justify-between text-xs font-semibold">
        <span className="text-secondary-foreground">Total</span>
        <span className="text-primary font-mono">
          {formatPercentage(breakdown.total, 2)}
        </span>
      </div>
    </div>
  )
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult: _originalAuctionResult,
  epochsPerYear,
  dsSamConfig: _dsSamConfig,
  level: _level,
  simulatedValidator,
  isCalculating,
  validatorMeta,
  onValidatorClick,
}) => {
  const {
    auctionData: { validators },
  } = auctionResult
  const samDistributedStake = Math.round(selectSamDistributedStake(validators))
  const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)
  const projectedApy = selectProjectedAPY(auctionResult, epochsPerYear)

  // Ref for click-outside detection
  const tableWrapRef = useRef<HTMLDivElement>(null)

  // Hovered row for APY tooltip
  const [hoveredApyRow, setHoveredApyRow] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('stakeDelta')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const SortIndicator: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sortColumn !== column) return null
    return (
      <span className="ml-1 text-primary">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

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

  // Sort validators based on current sort column and direction
  const sortedValidators = useMemo(() => {
    const sorted = [...validatorsWithBond].sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case 'rank':
        case 'stakeDelta':
          cmp =
            a.auctionStake.marinadeSamTargetSol -
            a.marinadeActivatedStakeSol -
            (b.auctionStake.marinadeSamTargetSol - b.marinadeActivatedStakeSol)
          break
        case 'validator': {
          const nameA = validatorMeta?.get(a.voteAccount)?.name ?? a.voteAccount
          const nameB = validatorMeta?.get(b.voteAccount)?.name ?? b.voteAccount
          cmp = nameA.localeCompare(nameB)
          break
        }
        case 'maxApy':
          cmp = selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
          break
        case 'bond':
          cmp = a.bondBalanceSol - b.bondBalanceSol
          break
        case 'nextStep':
          cmp =
            b.auctionStake.marinadeSamTargetSol -
            a.auctionStake.marinadeSamTargetSol
          break
        default:
          cmp =
            b.auctionStake.marinadeSamTargetSol -
            a.auctionStake.marinadeSamTargetSol
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [
    validatorsWithBond,
    sortColumn,
    sortDirection,
    validatorMeta,
    epochsPerYear,
  ])

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
      unit: 'SOL',
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

    const validatorName =
      validatorMeta?.get(voteAccount)?.name ?? `${voteAccount.slice(0, 8)}...`

    const rowClasses = [
      'border-b border-border-grid bg-card transition-colors duration-[120ms] cursor-pointer',
      !inSet && 'bg-destructive/[0.02]',
      isHovered && (inSet ? 'bg-primary-light' : 'bg-destructive/[0.05]'),
      !isHovered && inSet && 'hover:bg-primary-light',
      !isHovered && !inSet && 'hover:bg-destructive/[0.05]',
      isSimulated && 'bg-primary-light-10',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <TableRow
        key={voteAccount}
        className={rowClasses}
        onMouseEnter={() => setHoveredRow(voteAccount)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => onValidatorClick(voteAccount)}
      >
        {/* Rank */}
        <TableCell className="px-3.5 py-3 text-center text-muted-foreground font-medium font-mono text-xs w-10">
          {rank}
        </TableCell>

        {/* Validator */}
        <TableCell className="px-3.5 py-3 min-w-[180px]">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-medium text-[13px]">
              {validatorName}
            </span>
            {hasAlert && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 animate-pulse" />
            )}
          </div>
          <div className="text-secondary-foreground text-[11px] mt-px font-mono">
            {voteAccount.slice(0, 8)}...{voteAccount.slice(-4)}
          </div>
        </TableCell>

        {/* Max APY with hover tooltip */}
        <TableCell
          className="px-3.5 py-3 relative"
          onMouseEnter={e => {
            e.stopPropagation()
            setHoveredApyRow(voteAccount)
          }}
          onMouseLeave={() => setHoveredApyRow(null)}
        >
          <span
            className={`inline-block px-2.5 py-[3px] rounded-md font-semibold text-[13px] font-mono ${
              inSet
                ? 'bg-primary-light text-primary'
                : 'bg-destructive-light text-destructive'
            }`}
          >
            {formatPercentage(maxApy, 2)}
          </span>
          {hoveredApyRow === voteAccount && (
            <ApyTooltip validator={validator} epochsPerYear={epochsPerYear} />
          )}
        </TableCell>

        {/* Bond Health */}
        <TableCell className="px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-medium"
              style={{ background: bondStyle.bg, color: bondStyle.color }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: bondStyle.color }}
              />
              {bondStyle.label}
            </span>
            <span className="text-muted-foreground text-[11px] font-mono">
              {formatSolAmount(selectBondSize(validator), 0)} SOL
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-[3px] bg-secondary rounded-sm w-14 shrink-0">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(100 - bondUtilPct, 0)}%`,
                  background: bondStyle.color,
                }}
              />
            </div>
            <span
              className="text-[10px] font-mono whitespace-nowrap"
              style={{
                color:
                  bondRunway <= 10
                    ? bondStyle.color
                    : 'var(--muted-foreground)',
              }}
            >
              ~{Math.round(bondRunway)}ep
            </span>
          </div>
        </TableCell>

        {/* Stake Delta */}
        <TableCell className="px-3.5 py-3">
          <span
            className="font-semibold text-[13px] font-mono"
            style={{ color: delta.color }}
          >
            {delta.arrow} {delta.text}
            {delta.text !== '\u2014' && ' SOL'}
          </span>
        </TableCell>

        {/* Next Step */}
        <TableCell className="px-3.5 py-3 max-w-[350px]">
          <div
            className="inline-flex items-start gap-[5px] text-xs leading-[1.35] px-2.5 py-1 rounded-md"
            style={{ background: tipStyle.bg, color: tipStyle.color }}
          >
            <span className="shrink-0">{tipStyle.icon}</span>
            <span className="break-words">
              {tip.text.replace(/~?\d+\.\d{3,}/g, m => {
                const n = parseFloat(m.replace(/^~/, ''))
                const prefix = m.startsWith('~') ? '~' : ''
                return `${prefix}${Math.round(n * 100) / 100}`
              })}
            </span>
          </div>
        </TableCell>

        {/* Chevron */}
        <TableCell className="px-2.5 py-3 w-10">
          <div
            className={`w-7 h-7 rounded-[7px] flex items-center justify-center border transition-all duration-[120ms] ${
              isHovered
                ? 'bg-primary-light border-primary/30'
                : 'bg-secondary border-border'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4.5 3L7.5 6L4.5 9"
                stroke={
                  isHovered ? 'var(--primary)' : 'var(--secondary-foreground)'
                }
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div
      ref={tableWrapRef}
      className={`w-full ${isCalculating ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-card rounded-xl px-5 py-4 border border-border shadow-card"
          >
            <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
              {stat.label}
              {stat.help && <HelpTip text={stat.help} />}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-semibold text-foreground font-mono">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-sm text-muted-foreground font-mono">
                  {stat.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <ShadTable className="font-sans text-[13px]">
          <TableHeader>
            <TableRow className="border-b border-border-grid">
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-10 text-center cursor-pointer hover:text-primary"
                onClick={() => handleSort('rank')}
              >
                #<SortIndicator column="rank" />
              </TableHead>
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted min-w-[150px] cursor-pointer hover:text-primary"
                onClick={() => handleSort('validator')}
              >
                Validator
                <SortIndicator column="validator" />
              </TableHead>
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-[100px] cursor-pointer hover:text-primary"
                onClick={() => handleSort('maxApy')}
              >
                Max APY
                <SortIndicator column="maxApy" />
                <HelpTip text={HELP_TEXT.maxApy} />
              </TableHead>
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-40 cursor-pointer hover:text-primary"
                onClick={() => handleSort('bond')}
              >
                Bond
                <SortIndicator column="bond" />
                <HelpTip text={HELP_TEXT.bondHealth} />
              </TableHead>
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-[120px] cursor-pointer hover:text-primary"
                onClick={() => handleSort('stakeDelta')}
              >
                Stake {'\u0394'}
                <SortIndicator column="stakeDelta" />
                <HelpTip text={HELP_TEXT.stakeDelta} />
              </TableHead>
              <TableHead
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted min-w-[200px] cursor-pointer hover:text-primary"
                onClick={() => handleSort('nextStep')}
              >
                Next Step
                <SortIndicator column="nextStep" />
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {winningValidators.map((v, i) => renderRow(v, i))}

            {/* Winning Set Cutoff Divider */}
            {nonWinningValidators.length > 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary-light-10 via-primary-light to-primary-light-10 border-y-2 border-primary">
                    <div className="flex items-center gap-1.5">
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
                      <span className="text-xs font-semibold text-primary">
                        Winning Set Cutoff
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-primary opacity-20" />
                    <span className="text-xs text-primary font-mono font-semibold">
                      Winning APY: {formatPercentage(winningAPY, 2)}
                    </span>
                    <div className="flex-1 h-px bg-primary opacity-20" />
                    <span className="text-[11px] text-muted-foreground">
                      {winningCount} of {totalValidators} validators
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {nonWinningValidators.map((v, i) => renderRow(v, winningCount + i))}
          </TableBody>
        </ShadTable>
      </div>
    </div>
  )
}

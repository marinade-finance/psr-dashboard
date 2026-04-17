import React, { useMemo, useRef, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { Card } from 'src/components/ui/card'
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
  selectExpectedStakeChange,
  selectMaxAPY,
  selectSamDistributedStake,
  selectVoteAccount,
  selectWinningAPY,
  selectProjectedAPY,
} from 'src/services/sam'
import {
  buildOriginalPositionsMap,
  detectChangedValidators,
  getPositionChange,
  insertGhostRows,
} from 'src/services/simulation'
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
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/services/simulation'

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

function makeCompareFn(
  col: SortColumn,
  dir: SortDirection,
  validatorMeta: Map<string, ValidatorMeta> | undefined,
  epochsPerYear: number,
): (a: AuctionValidator, b: AuctionValidator) => number {
  return (a, b) => {
    let cmp = 0
    switch (col) {
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
      default:
        cmp =
          b.auctionStake.marinadeSamTargetSol -
          a.auctionStake.marinadeSamTargetSol
    }
    return dir === 'asc' ? cmp : -cmp
  }
}

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  level: UserLevel
  simulatedValidators?: Set<string>
  isCalculating: boolean
  simulationModeActive?: boolean
  editingValidator?: string | null
  pendingEdits?: PendingEdits
  validatorMeta?: Map<string, ValidatorMeta>
  stakeChanges?: Map<string, number>
  onValidatorClick: (voteAccount: string) => void
  onFieldChange?: (field: string, value: string) => void
  onRunSimulation?: () => void
  onCancelEditing?: () => void
  onToggleSimulation?: () => void
  onClearValidator?: (voteAccount: string) => void
  onResetSimulation?: () => void
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
  originalAuctionResult,
  epochsPerYear,
  level: _level,
  simulatedValidators = new Set(),
  isCalculating,
  validatorMeta,
  stakeChanges,
  onValidatorClick,
  onClearValidator,
  onResetSimulation,
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
  const sortedValidators = useMemo(
    () =>
      [...validatorsWithBond].sort(
        makeCompareFn(sortColumn, sortDirection, validatorMeta, epochsPerYear),
      ),
    [
      validatorsWithBond,
      sortColumn,
      sortDirection,
      validatorMeta,
      epochsPerYear,
    ],
  )

  // Simulation: original position map (same sort as current)
  const originalPositionsMap = useMemo(() => {
    if (!originalAuctionResult) return null
    return buildOriginalPositionsMap(
      originalAuctionResult,
      makeCompareFn(sortColumn, sortDirection, validatorMeta, epochsPerYear),
    )
  }, [
    originalAuctionResult,
    sortColumn,
    sortDirection,
    validatorMeta,
    epochsPerYear,
  ])

  const changedValidators = useMemo(
    () =>
      originalAuctionResult
        ? detectChangedValidators(
            simulatedValidators,
            validators,
            originalAuctionResult,
          )
        : new Set<string>(),
    [simulatedValidators, validators, originalAuctionResult],
  )

  // Split into winners and non-winners, with ghost rows inserted
  const allDisplayValidators = useMemo(() => {
    const base = sortedValidators.map(v => ({
      validator: v,
      isGhost: false as const,
    }))
    if (
      !originalAuctionResult ||
      !originalPositionsMap ||
      changedValidators.size === 0
    )
      return base
    return insertGhostRows(
      base,
      changedValidators,
      originalAuctionResult,
      originalPositionsMap,
      orig =>
        ({
          ...orig,
          bondHealth: getBondHealth(
            calculateBondUtilization(orig),
            orig.bondGoodForNEpochs ?? 0,
          ),
        }) as ValidatorWithBondState,
    )
  }, [
    sortedValidators,
    changedValidators,
    originalAuctionResult,
    originalPositionsMap,
  ])

  const winningValidators = allDisplayValidators.filter(
    d => !d.isGhost && d.validator.auctionStake.marinadeSamTargetSol > 0,
  )
  const nonWinningValidators = allDisplayValidators.filter(
    d => !d.isGhost && d.validator.auctionStake.marinadeSamTargetSol === 0,
  )

  const totalRedelegation = useMemo(() => {
    if (!stakeChanges) return 0
    return [...stakeChanges.values()]
      .filter(x => x > 0)
      .reduce((s, x) => s + x, 0)
  }, [stakeChanges])

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
    {
      label: 'Re-delegation',
      value: formatSolAmount(Math.round(totalRedelegation), 0),
      unit: 'SOL',
      help: 'Total SAM stake expected to move next epoch (~0.7% of TVL rebalancing budget)',
    },
  ]

  const RANK_MONO = 'font-mono text-xs'

  const RankCell = ({
    rank,
    isGhost,
    isSimulated,
    origPos,
    posColor,
    voteAccount,
  }: {
    rank: number
    isGhost: boolean
    isSimulated: boolean
    origPos: number | null
    posColor: string | undefined
    voteAccount: string
  }) => {
    if (isGhost)
      return (
        <span className={`text-muted-foreground ${RANK_MONO}`}>
          {origPos ?? rank}
        </span>
      )
    if (isSimulated && onClearValidator)
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`font-medium ${RANK_MONO}`}
            style={{ color: posColor ?? 'var(--muted-foreground)' }}
          >
            {rank}
          </span>
          <button
            className="text-[10px] text-muted-foreground hover:text-destructive leading-none"
            onClick={e => {
              e.stopPropagation()
              onClearValidator(voteAccount)
            }}
            title="Remove from simulation"
          >
            ✕
          </button>
        </div>
      )
    return (
      <span className={`text-muted-foreground font-medium ${RANK_MONO}`}>
        {rank}
      </span>
    )
  }

  const renderRow = (
    validator: ValidatorWithBondState,
    index: number,
    isGhost = false,
  ) => {
    const voteAccount = selectVoteAccount(validator)
    const inSet = validator.auctionStake.marinadeSamTargetSol > 0
    const rank = index + 1
    const isHovered = !isGhost && hoveredRow === voteAccount
    const isSimulated = simulatedValidators.has(voteAccount)

    // Position change for simulated rows
    const origPos = originalPositionsMap?.get(voteAccount) ?? null
    const posChange =
      isSimulated && !isGhost ? getPositionChange(origPos, rank) : null
    const posColor =
      posChange?.direction === 'improved'
        ? 'var(--status-green)'
        : posChange?.direction === 'worsened'
          ? 'var(--destructive)'
          : undefined

    // Bond health
    const bondUtilPct = calculateBondUtilization(validator)
    const bondRunway = validator.bondGoodForNEpochs ?? 0
    const bondHealth = validator.bondHealth
    const bondStyle = getBondHealthStyle(bondHealth)
    const hasAlert = bondRunway <= 5 || bondUtilPct >= 85

    // Stake delta (fallback) and expected change
    const delta = formatStakeDelta(validator)
    const expectedChange = stakeChanges
      ? selectExpectedStakeChange(voteAccount, stakeChanges)
      : null

    // Tip
    const tip = getValidatorTip(validator, winningAPY, epochsPerYear)
    const tipStyle = getTipStyle(tip.urgency)

    // Max APY
    const maxApy = selectMaxAPY(validator, epochsPerYear)

    const validatorName =
      validatorMeta?.get(voteAccount)?.name ?? `${voteAccount.slice(0, 8)}...`

    const rowClasses = [
      'border-b border-border-grid transition-colors duration-[120ms]',
      isGhost
        ? 'opacity-40 line-through bg-muted/30 cursor-default'
        : 'bg-card cursor-pointer',
      !isGhost && !inSet && 'bg-destructive/[0.02]',
      !isGhost &&
        isHovered &&
        (inSet ? 'bg-primary-light' : 'bg-destructive/[0.05]'),
      !isGhost && !isHovered && inSet && 'hover:bg-primary-light',
      !isGhost && !isHovered && !inSet && 'hover:bg-destructive/[0.05]',
      !isGhost &&
        isSimulated &&
        posColor &&
        'ring-1 ring-inset ring-current/20',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <TableRow
        key={isGhost ? `${voteAccount}-ghost` : voteAccount}
        className={rowClasses}
        style={posColor ? { borderLeftColor: posColor } : undefined}
        onMouseEnter={() => !isGhost && setHoveredRow(voteAccount)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => !isGhost && onValidatorClick(voteAccount)}
      >
        {/* Rank / ✕ */}
        <TableCell className="px-3.5 py-3 text-center w-10">
          <RankCell
            rank={rank}
            isGhost={isGhost}
            isSimulated={isSimulated}
            origPos={origPos}
            posColor={posColor}
            voteAccount={voteAccount}
          />
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

        {/* Stake / Next Δ */}
        <TableCell className="px-3.5 py-3">
          {expectedChange !== null ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[11px] font-mono">
                {formatSolAmount(validator.marinadeActivatedStakeSol, 0)} SOL
              </span>
              {expectedChange === 0 ? (
                <span className="text-muted-foreground text-[12px] font-mono">
                  &mdash;
                </span>
              ) : (
                <span
                  className="font-semibold text-[13px] font-mono"
                  style={{
                    color:
                      expectedChange > 0
                        ? 'var(--status-green)'
                        : 'var(--destructive)',
                  }}
                >
                  {expectedChange > 0 ? '+' : ''}
                  {formatSolAmount(Math.round(expectedChange), 0)} SOL
                </span>
              )}
            </div>
          ) : (
            <span
              className="font-semibold text-[13px] font-mono"
              style={{ color: delta.color }}
            >
              {delta.arrow} {delta.text}
              {delta.text !== '\u2014' && ' SOL'}
            </span>
          )}
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
      <div className="flex flex-wrap items-start gap-3 mb-6 px-4">
        {stats.map(stat => (
          <Card
            key={stat.label}
            className="px-3 py-3 sm:px-5 sm:py-4 flex-1 min-w-[140px] sm:min-w-[160px] overflow-hidden"
          >
            <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
              {stat.label}
              {stat.help && <HelpTip text={stat.help} />}
            </div>
            <div className="flex items-baseline gap-0.5 min-w-0 overflow-hidden">
              <span className="text-xl sm:text-2xl font-semibold text-foreground font-mono truncate">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-sm text-muted-foreground font-mono shrink-0">
                  {stat.unit}
                </span>
              )}
            </div>
          </Card>
        ))}
        {simulatedValidators.size > 0 && onResetSimulation && (
          <button
            onClick={onResetSimulation}
            className="self-stretch px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors whitespace-nowrap"
          >
            Reset Simulation ({simulatedValidators.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mx-4 bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto">
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
                className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-[140px] cursor-pointer hover:text-primary"
                onClick={() => handleSort('stakeDelta')}
              >
                Stake / Next {'\u0394'}
                <SortIndicator column="stakeDelta" />
                <HelpTip text="Current active stake and expected change next epoch based on auction results and rebalancing budget (~0.7% TVL/epoch)" />
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
            {allDisplayValidators
              .filter(
                d =>
                  d.isGhost ||
                  d.validator.auctionStake.marinadeSamTargetSol > 0,
              )
              .map((d, i) => renderRow(d.validator, i, d.isGhost))}

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

            {allDisplayValidators
              .filter(
                d =>
                  d.isGhost ||
                  d.validator.auctionStake.marinadeSamTargetSol === 0,
              )
              .map((d, i) =>
                renderRow(d.validator, winningCount + i, d.isGhost),
              )}
          </TableBody>
        </ShadTable>
      </div>
    </div>
  )
}

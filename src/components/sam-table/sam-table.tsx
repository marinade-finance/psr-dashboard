import React, { useMemo, useState } from 'react'

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
import { ConcentrationMetric } from 'src/components/concentration-metric/concentration-metric'
import { ValidatorIdentity } from 'src/components/validator-identity/validator-identity'
import { ValidatorJump } from 'src/components/validator-jump/validator-jump'
import { formatPercentage, formatSolAmount, stake } from 'src/format'
import { bondHealthFromAuction } from 'src/services/breakdowns'
import { HELP_TEXT } from 'src/services/help-text'
import {
  augmentAuctionResult,
  buildConcentrationBreakdown,
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
  getValidatorTip,
  getTipStyle,
  calculateBondUtilization,
  nextStakeDeltaCell,
} from 'src/services/tip-engine'

import { UserLevel } from '../navigation/navigation'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type ValidatorMeta = {
  name?: string
  countryIso?: string | null
  rank?: number
}

type BondHealthTier = 'healthy' | 'soft' | 'watch' | 'critical'

// Validator with computed bond state
type ValidatorWithBondState = AugmentedAuctionValidator & {
  bondHealth: BondHealthTier
}

const TEXT_MUTED = 'text-muted-foreground'
const BG_MUTED = 'bg-muted-foreground'

export const BOND_CHIP: Record<
  BondHealthTier,
  { chip: string; dot: string; bar: string; shortText: string; label: string }
> = {
  healthy: {
    chip: 'bg-primary-light-10 text-primary',
    dot: 'bg-primary',
    bar: 'bg-primary',
    shortText: 'text-primary',
    label: 'Healthy',
  },
  soft: {
    chip: `bg-secondary ${TEXT_MUTED}`,
    dot: BG_MUTED,
    bar: BG_MUTED,
    shortText: TEXT_MUTED,
    label: 'Adequate',
  },
  watch: {
    chip: 'bg-warning-light text-warning',
    dot: 'bg-warning',
    bar: 'bg-warning',
    shortText: 'text-warning',
    label: 'Watch',
  },
  critical: {
    chip: 'bg-destructive-light text-destructive',
    dot: 'bg-destructive',
    bar: 'bg-destructive',
    shortText: 'text-destructive',
    label: 'Critical',
  },
}

export type SortColumn =
  | 'rank'
  | 'validator'
  | 'maxApy'
  | 'bond'
  | 'stakeDelta'
  | 'nextStep'
export type SortDirection = 'asc' | 'desc'

// Basic mode: hide validators with no marinade stake (current or target) and
// validators whose bond runway is below the SDK-required minimum — these
// generate the noisiest CTAs and aren't actionable for most readers. Expert
// mode keeps the long tail; the jump-to-validator search can still open
// detail for any filtered-out validator.
export function passesTableFilter(
  v: AuctionValidator,
  level: UserLevel,
  minBondEpochs: number,
): boolean {
  if (!v.bondBalanceSol) return false
  if (level === UserLevel.Expert) return true
  const inSetOrStaked =
    v.marinadeActivatedStakeSol > 0 || v.auctionStake.marinadeSamTargetSol > 0
  if (!inSetOrStaked) return false
  if ((v.bondGoodForNEpochs ?? 0) < minBondEpochs) return false
  return true
}

export function makeCompareFn(
  col: SortColumn,
  dir: SortDirection,
  validatorMeta: Map<string, ValidatorMeta> | undefined,
  epochsPerYear: number,
): (a: AuctionValidator, b: AuctionValidator) => number {
  return (a, b) => {
    let cmp = 0
    switch (col) {
      case 'rank':
        // Rank is built from selectMaxAPY desc (auctionRankMap below). The
        // base cmp is asc; the dir flip below produces desc on default click.
        cmp = selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        break
      case 'stakeDelta':
        cmp = a.marinadeActivatedStakeSol - b.marinadeActivatedStakeSol
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
  dsSamConfig: DsSamConfig
  level: UserLevel
  simulatedValidators?: Set<string>
  isCalculating: boolean
  validatorMeta?: Map<string, ValidatorMeta>
  onValidatorClick: (voteAccount: string) => void
  onValidatorSearch?: (voteAccount: string) => void
  onClearValidator?: (voteAccount: string) => void
  onResetSimulation?: () => void
}

const RANK_MONO = 'font-mono text-xs'

type PenaltyKind = 'bidLow' | 'blacklist' | 'risk'

const PENALTY_CLASSES: Record<PenaltyKind, string> = {
  bidLow: 'bg-destructive-light text-destructive',
  blacklist: 'bg-muted text-muted-foreground',
  risk: 'bg-warning-light text-warning',
}

const PENALTY_ICONS: Record<PenaltyKind, React.ReactElement> = {
  bidLow: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  ),
  blacklist: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  risk: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
}

const PenaltyBadges: React.FC<{ validator: AuctionValidator }> = ({
  validator,
}) => {
  const stakeSol = validator.marinadeActivatedStakeSol
  const badges: { label: string; sol: number; kind: PenaltyKind }[] = []
  const bidLowSol = (stakeSol * validator.revShare.bidTooLowPenaltyPmpe) / 1000
  const blacklistSol = (stakeSol * validator.revShare.blacklistPenaltyPmpe) / 1000
  const bondRiskSol = validator.values?.bondRiskFeeSol ?? 0
  if (bidLowSol > 0)
    badges.push({ label: 'BidTooLow', sol: bidLowSol, kind: 'bidLow' })
  if (blacklistSol > 0)
    badges.push({ label: 'Blacklist', sol: blacklistSol, kind: 'blacklist' })
  if (bondRiskSol > 0)
    badges.push({ label: 'BondRiskFee', sol: bondRiskSol, kind: 'risk' })
  if (badges.length === 0) return null
  const tip = badges
    .map(b => `${b.label}: ${formatSolAmount(b.sol, 3)} SOL (estimate)`)
    .join('\n')
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" title={tip}>
      {badges.map(b => (
        <span
          key={b.label}
          aria-label={b.label}
          className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded cursor-help select-none ${PENALTY_CLASSES[b.kind]}`}
        >
          {PENALTY_ICONS[b.kind]}
        </span>
      ))}
    </span>
  )
}

const SortIndicator: React.FC<{
  column: SortColumn
  sortColumn: SortColumn
  sortDirection: SortDirection
}> = ({ column, sortColumn, sortDirection }) => {
  if (sortColumn !== column) return null
  return (
    <span className="ml-1 text-primary">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  )
}

const RankCell: React.FC<{
  rank: number
  inSet: boolean
  isGhost: boolean
  isSimulated: boolean
  posColor: string | undefined
  tipColor: string
  tipIcon: React.ReactNode
  voteAccount: string
  onClearValidator?: (voteAccount: string) => void
}> = ({
  rank,
  inSet,
  isGhost,
  isSimulated,
  posColor,
  tipColor,
  tipIcon,
  voteAccount,
  onClearValidator,
}) => {
  const rankLabel = rank < 0 ? `-#${-rank}` : `#${rank}`
  if (isGhost)
    return (
      <span
        className={`text-muted-foreground ${RANK_MONO} flex flex-col items-center gap-0`}
      >
        <span>{rankLabel}</span>
        <span className="text-xs opacity-60 font-normal leading-tight">
          {inSet ? 'above' : 'below'}
        </span>
      </span>
    )
  if (isSimulated && onClearValidator)
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span
          className={`font-medium ${RANK_MONO}`}
          style={{ color: posColor ?? 'var(--muted-foreground)' }}
        >
          {rankLabel}
        </span>
        <button
          className="text-xs text-muted-foreground hover:text-destructive leading-none"
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
    <span
      className={`font-medium ${RANK_MONO} flex flex-col items-center gap-0`}
      style={{ color: tipColor }}
    >
      <span className="flex items-center gap-0.5">
        <span className="leading-none">{tipIcon}</span>{rankLabel}
      </span>
      <span className="text-xs opacity-60 font-normal text-muted-foreground leading-tight">
        {inSet ? 'above' : 'below'}
      </span>
    </span>
  )
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult,
  epochsPerYear,
  dsSamConfig,
  level,
  simulatedValidators = new Set(),
  isCalculating,
  validatorMeta,
  onValidatorClick,
  onValidatorSearch,
  onClearValidator,
  onResetSimulation,
}) => {
  const winningTotalPmpe = auctionResult.winningTotalPmpe
  const {
    auctionData: { validators },
  } = auctionResult
  const samDistributedStake = selectSamDistributedStake(validators)
  const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)
  const projectedApy = selectProjectedAPY(auctionResult, epochsPerYear)
  const concentration = useMemo(
    () => buildConcentrationBreakdown(auctionResult, dsSamConfig),
    [auctionResult, dsSamConfig],
  )

  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('maxApy')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Current validators with bond health and expected stake change computed
  const validatorsWithBond: ValidatorWithBondState[] = useMemo(
    () =>
      augmentAuctionResult(auctionResult)
        .filter(validator =>
          passesTableFilter(validator, level, dsSamConfig.minBondEpochs),
        )
        .map(validator => ({
          ...validator,
          bondHealth: bondHealthFromAuction(
            validator,
            dsSamConfig,
            winningTotalPmpe,
          ),
        })),
    [auctionResult, dsSamConfig, winningTotalPmpe, level],
  )

  // Stable auction rank by maxApy desc — independent of display sort
  const auctionRankMap = useMemo(() => {
    const sorted = [...validatorsWithBond].sort(
      (va, vb) =>
        selectMaxAPY(vb, epochsPerYear) - selectMaxAPY(va, epochsPerYear),
    )
    return new Map(
      sorted.map((validator, i) => [selectVoteAccount(validator), i + 1]),
    )
  }, [validatorsWithBond, epochsPerYear])

  // Cutoff-relative rank: positive = above cutoff (1 = closest to cutoff,
  // i.e. lowest-APY in-set), negative = below cutoff (-1 = closest to cutoff,
  // i.e. highest-APY out-of-set). Independent of display sort.
  const cutoffRankMap = useMemo(() => {
    const map = new Map<string, number>()
    const inSet = validatorsWithBond.filter(
      v => v.auctionStake.marinadeSamTargetSol > 0,
    )
    const outOfSet = validatorsWithBond.filter(
      v => v.auctionStake.marinadeSamTargetSol <= 0,
    )
    const inSetByApyAsc = [...inSet].sort(
      (a, b) => selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear),
    )
    inSetByApyAsc.forEach((v, i) => map.set(selectVoteAccount(v), i + 1))
    const outOfSetByApyDesc = [...outOfSet].sort(
      (a, b) => selectMaxAPY(b, epochsPerYear) - selectMaxAPY(a, epochsPerYear),
    )
    outOfSetByApyDesc.forEach((v, i) => map.set(selectVoteAccount(v), -(i + 1)))
    return map
  }, [validatorsWithBond, epochsPerYear])

  // Original auction rank map — same maxApy sort, built from pre-simulation data
  // Used for ghost row rank display and position-change comparison
  const originalAuctionRankMap = useMemo(() => {
    if (!originalAuctionResult) return null
    return buildOriginalPositionsMap(
      originalAuctionResult,
      (va, vb) =>
        selectMaxAPY(vb, epochsPerYear) - selectMaxAPY(va, epochsPerYear),
    )
  }, [originalAuctionResult, epochsPerYear])

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

  // Simulation: display-sort-based original position map — used only for ghost row insertion index
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
    const base = sortedValidators.map(validator => ({
      validator,
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
          bondHealth: bondHealthFromAuction(
            orig,
            dsSamConfig,
            winningTotalPmpe,
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
    row => !row.isGhost && row.validator.auctionStake.marinadeSamTargetSol > 0,
  )
  // Cutoff partition: who would clear the bid threshold by yield, regardless
  // of whether the auction actually allocated them target stake. Bid-eligible
  // bond-blocked validators belong above the line; only validators whose max
  // APY is below the winning APY belong below.
  const bidQualifies = (v: AuctionValidator) =>
    selectMaxAPY(v, epochsPerYear) >= winningAPY
  const aboveCutoff = allDisplayValidators.filter(
    row => row.isGhost || bidQualifies(row.validator),
  )
  const belowCutoff = allDisplayValidators.filter(
    row => !row.isGhost && !bidQualifies(row.validator),
  )
  const aboveCount = aboveCutoff.filter(row => !row.isGhost).length
  const totalRedelegation = useMemo(
    () =>
      validatorsWithBond.reduce((sum, validator) => {
        const change = selectExpectedStakeChange(validator)
        return change > 0 ? sum + change : sum
      }, 0),
    [validatorsWithBond],
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
      help: HELP_TEXT.totalAuctionStake,
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
      help: HELP_TEXT.projectedApy,
    },
    {
      label: 'Winning Validators',
      value: `${winningCount} / ${totalValidators}`,
      unit: '',
      help: HELP_TEXT.winningValidators,
    },
    {
      label: 'Re-delegation',
      value: formatSolAmount(totalRedelegation, 0),
      unit: 'SOL',
      help: 'Roughly how much SOL Marinade will move into under-stake validators next epoch to push them toward their goal allocation.',
    },
  ]

  const renderRow = (
    validator: ValidatorWithBondState,
    index: number,
    isGhost = false,
  ) => {
    const voteAccount = selectVoteAccount(validator)
    const inSet = validator.auctionStake.marinadeSamTargetSol > 0
    const origAuctionRank = originalAuctionRankMap?.get(voteAccount) ?? null
    const rank = isGhost
      ? (origAuctionRank ?? index + 1)
      : (auctionRankMap.get(voteAccount) ?? index + 1)
    const cutoffRank = cutoffRankMap.get(voteAccount) ?? rank
    const isHovered = !isGhost && hoveredRow === voteAccount
    const isSimulated = simulatedValidators.has(voteAccount)

    // Position change for simulated rows — compare original vs new auction rank
    const posChange =
      isSimulated && !isGhost ? getPositionChange(origAuctionRank, rank) : null
    const posColor =
      posChange?.direction === 'improved'
        ? 'var(--status-green)'
        : posChange?.direction === 'worsened'
          ? 'var(--destructive)'
          : undefined

    // Bond health
    const bondUtilPct = calculateBondUtilization(
      validator,
      dsSamConfig.minBondEpochs,
    )
    const bondRunway = validator.bondGoodForNEpochs ?? 0
    const bondHealth = validator.bondHealth
    const bondChip = BOND_CHIP[bondHealth]
    const hasAlert = bondRunway <= 5 || bondUtilPct >= 85

    const expectedChange = selectExpectedStakeChange(validator)

    // Tip
    const tip = getValidatorTip(validator, dsSamConfig, winningTotalPmpe)
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
      !isGhost && isSimulated && 'ring-2 ring-inset ring-status-yellow',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <TableRow
        key={isGhost ? `${voteAccount}-ghost` : voteAccount}
        className={rowClasses}
        style={posColor ? { borderLeftColor: posColor } : undefined}
        role={isGhost ? undefined : 'button'}
        tabIndex={isGhost ? -1 : 0}
        aria-label={isGhost ? undefined : `Open detail for ${validatorName}`}
        onMouseEnter={() => !isGhost && setHoveredRow(voteAccount)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => !isGhost && onValidatorClick(voteAccount)}
        onKeyDown={e => {
          if (isGhost) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onValidatorClick(voteAccount)
          }
        }}
      >
        {/* Rank / ✕ */}
        <TableCell className="px-3.5 py-3 text-center w-10">
          <RankCell
            rank={cutoffRank}
            inSet={inSet}
            isGhost={isGhost}
            isSimulated={isSimulated}
            posColor={posColor}
            tipColor={tipStyle.color}
            tipIcon={tip.icon ?? tipStyle.icon}
            voteAccount={voteAccount}
            onClearValidator={onClearValidator}
          />
        </TableCell>

        {/* Validator */}
        <TableCell className="px-3.5 py-3 min-w-[180px] sm:min-w-[220px]">
          <ValidatorIdentity
            name={validatorName}
            voteAccount={voteAccount}
            responsive
            trailing={
              <>
                {hasAlert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 animate-pulse" />
                )}
                {!isGhost && <PenaltyBadges validator={validator} />}
              </>
            }
          />
        </TableCell>

        {/* Max APY */}
        <TableCell className="px-3.5 py-3">
          <span
            className={`inline-block px-2.5 py-[3px] rounded-md font-semibold text-sm font-mono ${
              inSet
                ? 'bg-primary-light text-primary'
                : 'bg-destructive-light text-destructive'
            }`}
          >
            {formatPercentage(maxApy, 2)}
          </span>
        </TableCell>

        {/* Bond Health */}
        <TableCell className="px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-xs font-medium ${bondChip.chip}`}
            >
              <span
                className={`w-[7px] h-[7px] rounded-full ${bondChip.dot}`}
              />
              {bondChip.label}
            </span>
            <span className="text-muted-foreground text-xs font-mono">
              {stake(selectBondSize(validator))}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-[3px] bg-secondary rounded-sm w-14 shrink-0">
              <div
                className={`h-full rounded-sm ${bondChip.bar}`}
                style={{ width: `${Math.max(100 - bondUtilPct, 0)}%` }}
              />
            </div>
            <span
              className={`text-xs opacity-60 font-mono whitespace-nowrap ${bondRunway <= 10 ? bondChip.shortText : TEXT_MUTED}`}
            >
              ({Math.round(bondRunway)}ep)
            </span>
          </div>
        </TableCell>

        {/* Stake / Next Δ */}
        <TableCell className="px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-mono">
              {stake(validator.marinadeActivatedStakeSol)}
            </span>
            {(() => {
              const cell = nextStakeDeltaCell(expectedChange)
              return (
                <span
                  className={`font-mono text-xs ${
                    cell.tone === 'neutral'
                      ? TEXT_MUTED
                      : 'font-semibold text-sm'
                  }`}
                  style={
                    cell.tone === 'neutral'
                      ? undefined
                      : {
                          color:
                            cell.tone === 'positive'
                              ? 'var(--status-green)'
                              : 'var(--destructive)',
                        }
                  }
                >
                  {cell.prefix}
                  {stake(expectedChange)}
                </span>
              )
            })()}
          </div>
        </TableCell>

        {/* Next Step */}
        <TableCell className="px-3.5 py-3 max-w-[350px]">
          <div
            className="inline-flex items-start gap-[5px] text-xs leading-[1.35] px-2.5 py-1 rounded-md"
            style={{ background: tipStyle.bg, color: tipStyle.color }}
          >
            <span className="shrink-0">{tip.icon ?? tipStyle.icon}</span>
            <span className="break-words">
              {tip.text.replace(/~?\d+\.\d{3,}/g, numStr => {
                const num = parseFloat(numStr.replace(/^~/, ''))
                const prefix = numStr.startsWith('~') ? '~' : ''
                return `${prefix}${Math.round(num * 100) / 100}`
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

  const inSimulation = simulatedValidators.size > 0

  return (
    <div
      className={`w-full ${isCalculating ? 'opacity-70 pointer-events-none' : ''} ${inSimulation ? 'ring-4 ring-status-yellow rounded-lg' : ''}`}
    >
      {inSimulation && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-status-yellow text-background font-semibold text-sm uppercase tracking-wide rounded-t-md">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-background animate-pulse" />
            Simulation Mode — what-if numbers, not live ({simulatedValidators.size}
            {' '}validator{simulatedValidators.size === 1 ? '' : 's'} modified)
          </span>
          {onResetSimulation && (
            <button
              onClick={onResetSimulation}
              className="px-3 py-1 rounded bg-background text-status-yellow text-xs font-bold hover:bg-background/90 transition-colors"
            >
              Reset Simulation
            </button>
          )}
        </div>
      )}
      <div className="max-w-[1920px] mx-auto">
        {/* Stats Bar */}
        <div className="flex flex-wrap items-start gap-3 mt-3 mb-3 px-4">
          {stats.map(stat => (
            <Card
              key={stat.label}
              className="px-3 py-3 sm:px-5 sm:py-4 flex-1 min-w-[140px] sm:min-w-[160px] overflow-hidden"
            >
              <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
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
        </div>

        {/* Concentration Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 px-4">
          <ConcentrationMetric
            label="Top Countries"
            rows={concentration.countries}
            capPct={concentration.countryCapPct}
            help="Share of auction-distributed stake by validator country. Bar fills against the per-country cap. (capped) means at least one validator was cut by the cap."
          />
          <ConcentrationMetric
            label="Top ASOs"
            rows={concentration.asos}
            capPct={concentration.asoCapPct}
            help="Share of auction-distributed stake by ASO (Autonomous System Operator). Bar fills against the per-ASO cap. (capped) means at least one validator was cut by the cap."
          />
        </div>

        {/* Search row — sits above the table, aligned with validator column */}
        {onValidatorSearch && (
          <div className="px-4 mb-4 flex">
            <ValidatorJump
              validators={validators}
              nameMap={validatorMeta ?? new Map()}
              onSelect={onValidatorSearch}
              className="w-full max-w-sm"
            />
          </div>
        )}

        {/* Table */}
        <div className="mx-4 bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto">
          <ShadTable className="font-sans text-sm">
            <TableHeader>
              <TableRow className="border-b border-border-grid">
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-10 text-center cursor-pointer hover:text-primary"
                  onClick={() => handleSort('rank')}
                >
                  #
                  <SortIndicator
                    column="rank"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </TableHead>
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted min-w-[150px] cursor-pointer hover:text-primary"
                  onClick={() => handleSort('validator')}
                >
                  Validator
                  <SortIndicator
                    column="validator"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </TableHead>
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-[100px] cursor-pointer hover:text-primary whitespace-nowrap"
                  onClick={() => handleSort('maxApy')}
                >
                  <div className="flex items-center gap-1">
                    Max APY
                    <SortIndicator
                      column="maxApy"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                    />
                    <HelpTip text={HELP_TEXT.maxApy} />
                  </div>
                </TableHead>
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-40 cursor-pointer hover:text-primary whitespace-nowrap"
                  onClick={() => handleSort('bond')}
                >
                  <div className="flex items-center gap-1">
                    Bond
                    <SortIndicator
                      column="bond"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                    />
                    <HelpTip text={HELP_TEXT.bondHealth} />
                  </div>
                </TableHead>
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-[140px] cursor-pointer hover:text-primary whitespace-nowrap"
                  onClick={() => handleSort('stakeDelta')}
                >
                  <div className="flex items-center gap-1">
                    Stake / Next change
                    <SortIndicator
                      column="stakeDelta"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                    />
                    <HelpTip text="How much stake you have right now, and how much it'll change next epoch. Gains depend on fresh deposits coming in; losses come from regular withdrawals, which Marinade pulls from the most over-stake validators first." />
                  </div>
                </TableHead>
                <TableHead
                  className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted min-w-[200px] cursor-pointer hover:text-primary"
                  onClick={() => handleSort('nextStep')}
                >
                  Next Step
                  <SortIndicator
                    column="nextStep"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </TableHead>
                <TableHead className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aboveCutoff.map((row, i) =>
                renderRow(row.validator, i, row.isGhost),
              )}

              {/* Winning Set Cutoff Divider — only meaningful when sorted by default APY rank */}
              {belowCutoff.length > 0 && sortColumn === 'maxApy' && (
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
                      <span className="text-xs text-muted-foreground">
                        {aboveCount} bid-eligible · {winningCount} winning
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {belowCutoff.map((row, i) =>
                renderRow(row.validator, aboveCount + i, row.isGhost),
              )}
            </TableBody>
          </ShadTable>
        </div>
      </div>
    </div>
  )
}

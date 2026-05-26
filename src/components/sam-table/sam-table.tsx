import React, { useCallback, useMemo, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { docsPath } from 'src/components/breakdowns/docs-path'
import { ConcentrationMetric } from 'src/components/concentration-metric/concentration-metric'
import { Gauge } from 'src/components/gauge/gauge'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { ICON_ARROW_DOWN_SM } from 'src/components/icons/icon-arrow-down-sm'
import { ICON_ARROW_UP_SM } from 'src/components/icons/icon-arrow-up-sm'
import { PENALTY_BID_LOW } from 'src/components/icons/penalty-bid-low'
import { PENALTY_BLACKLIST } from 'src/components/icons/penalty-blacklist'
import { PENALTY_RISK } from 'src/components/icons/penalty-risk'
import { TIP_ICONS } from 'src/components/icons/tip-icons'
import { Card } from 'src/components/ui/card'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table'
import { Tooltip } from 'src/components/ui/tooltip'
import { ValidatorIdentity } from 'src/components/validator-identity/validator-identity'
import { ValidatorSearch } from 'src/components/validator-search/validator-search'
import {
  CSS_DESTRUCTIVE,
  CSS_MUTED,
  CSS_MUTED_FG,
  CSS_STATUS_GREEN,
} from 'src/css'
import { pct, penalty, sol, stake } from 'src/format'
import {
  bidTooLowPenaltySol,
  blacklistPenaltySol,
} from 'src/services/bid-penalty'
import { computeBondCoverage } from 'src/services/bond-coverage'
import { bondHealthFromAuction } from 'src/services/bond-health'
import {
  bondCriticalFrac,
  bondGaugeScaleMax,
  bondUtilizationPct,
  effectiveBondRunway,
} from 'src/services/calculations'
import { HELP_TEXT } from 'src/services/help-text'
import {
  augmentAuctionResult,
  buildConcentrationBreakdown,
  selectBondSize,
  selectExpectedStakeChange,
  selectMaxAPY,
  selectRedelegationBudget,
  selectRedelegationPriorityFrontierPmpe,
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
  getTipIcon,
  nextStakeDeltaCell,
} from 'src/services/tip-engine'
import { assertNever } from 'src/utils/assert-never'

import type { UserLevel } from '../navigation/navigation'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { BondCoverage } from 'src/services/bond-coverage'
import type { BondHealthState } from 'src/services/bond-health'
import type { AugmentedAuctionValidator } from 'src/services/sam'

export type ValidatorMeta = {
  name?: string
}

// Validator with computed bond state
type ValidatorWithBondState = AugmentedAuctionValidator & {
  bondHealth: BondHealthState
  // Memoised so the per-row pipeline (bondHealth, tip, bond chip) computes
  // it exactly once instead of repeating the bond-coverage math 2-3× per
  // validator across ~300 rows.
  bondCoverage: BondCoverage
}

const TEXT_MUTED = 'text-muted-foreground'

// 1 arrow < 5k SOL, 2 arrows < 25k, 3 arrows ≥ 25k
function stakeArrowCount(delta: number): number {
  const abs = Math.abs(delta)
  if (abs < 1) return 0
  if (abs < 5_000) return 1
  if (abs < 25_000) return 2
  return 3
}
const DESTRUCTIVE_LIGHT_CHIP = 'bg-destructive-light text-destructive'
// no-bond and critical share the red chip — they differ only by label.
const DESTRUCTIVE_CHIP = {
  chip: DESTRUCTIVE_LIGHT_CHIP,
  dot: 'bg-destructive',
  bar: 'bg-destructive',
  shortText: 'text-destructive',
}

export const BOND_CHIP: Record<
  BondHealthState,
  { chip: string; dot: string; bar: string; shortText: string; label: string }
> = {
  'no-bond': {
    ...DESTRUCTIVE_CHIP,
    label: 'No bond',
  },
  critical: {
    ...DESTRUCTIVE_CHIP,
    label: 'Critical',
  },
  watch: {
    chip: 'bg-warning-light text-warning',
    dot: 'bg-warning',
    bar: 'bg-warning',
    shortText: 'text-warning',
    label: 'Watch',
  },
  healthy: {
    chip: 'bg-primary-light-10 text-primary',
    dot: 'bg-primary',
    bar: 'bg-primary',
    shortText: 'text-primary',
    label: 'Healthy',
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
  minBondBalanceSol: number,
): boolean {
  if ((v.bondBalanceSol ?? 0) < minBondBalanceSol) return false
  if (level === 'expert') return true
  const inSetOrStaked =
    v.marinadeActivatedStakeSol > 0 || v.auctionStake.marinadeSamTargetSol > 0
  return inSetOrStaked
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
        cmp =
          selectExpectedStakeChange(a as AugmentedAuctionValidator) -
          selectExpectedStakeChange(b as AugmentedAuctionValidator)
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
        cmp = (a.bondBalanceSol ?? 0) - (b.bondBalanceSol ?? 0)
        break
      case 'nextStep':
        // Sort by stake target — the simplest proxy for "how much help does
        // this validator need next". A future SortColumn value would force
        // a compile error here via assertNever rather than silently land
        // in the same branch.
        cmp =
          b.auctionStake.marinadeSamTargetSol -
          a.auctionStake.marinadeSamTargetSol
        break
      default:
        cmp = assertNever(col)
    }
    return dir === 'asc' ? cmp : -cmp
  }
}

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level?: UserLevel
  isCompact?: boolean
  simulatedValidators?: Set<string>
  isCalculating: boolean
  validatorMeta?: Map<string, ValidatorMeta>
  onValidatorClick: (voteAccount: string) => void
  onValidatorSearch?: (voteAccount: string) => void
  onClearValidator?: (voteAccount: string) => void
}

const RANK_MONO = 'font-mono text-xs'

// Module-level singleton so the `simulatedValidators = new Set()` default
// argument doesn't churn its identity on every render and invalidate
// downstream memos.
const EMPTY_SIMULATED_SET: Set<string> = new Set()

const EMPTY_NAME_MAP: Map<string, ValidatorMeta> = new Map()

// Trim 3+ decimal places in tip text to 2 — keeps the Next Step cell readable
// without losing the "~" prefix the tip engine uses for estimates.
const TIP_DECIMAL_RE = /~?\d+\.\d{3,}/g
const trimTipDecimals = (text: string) =>
  text.replace(TIP_DECIMAL_RE, numStr => {
    const num = parseFloat(numStr.replace(/^~/, ''))
    const prefix = numStr.startsWith('~') ? '~' : ''
    return `${prefix}${Math.round(num * 100) / 100}`
  })

type PenaltyKind = 'bidLow' | 'blacklist' | 'risk'

const PENALTY_CLASSES: Record<PenaltyKind, string> = {
  bidLow: DESTRUCTIVE_LIGHT_CHIP,
  blacklist: 'bg-muted text-muted-foreground',
  risk: 'bg-warning-light text-warning',
}

const PENALTY_ICONS: Record<PenaltyKind, React.ReactElement> = {
  bidLow: PENALTY_BID_LOW,
  blacklist: PENALTY_BLACKLIST,
  risk: PENALTY_RISK,
}

const PenaltyBadges = React.memo<{
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
}>(({ validator, dsSamConfig, winningTotalPmpe }) => {
  const badges: { label: string; sol: number; kind: PenaltyKind }[] = []
  const bidLowSol = bidTooLowPenaltySol(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )
  const blacklistSol = blacklistPenaltySol(validator)
  const bondRiskSol = validator.values?.bondRiskFeeSol ?? 0
  if (bidLowSol > 0)
    badges.push({ label: 'Bid too low', sol: bidLowSol, kind: 'bidLow' })
  if (blacklistSol > 0)
    badges.push({ label: 'Blacklisted', sol: blacklistSol, kind: 'blacklist' })
  if (bondRiskSol > 0)
    badges.push({ label: 'Bond risk fee', sol: bondRiskSol, kind: 'risk' })
  if (badges.length === 0) return null
  const tip = badges
    .map(b => `${b.label}: ~${penalty(b.sol)} estimated`)
    .join('\n')
  return (
    <Tooltip content={<span className="whitespace-pre-line">{tip}</span>}>
      <span className="inline-flex items-center gap-0.5 shrink-0">
        {badges.map(b => (
          <span
            key={b.label}
            aria-label={b.label}
            className={cn(
              'inline-flex items-center justify-center w-[18px] h-[18px] rounded cursor-help select-none',
              PENALTY_CLASSES[b.kind],
            )}
          >
            {PENALTY_ICONS[b.kind]}
          </span>
        ))}
      </span>
    </Tooltip>
  )
})

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

const RankCell = React.memo<{
  rank: number
  cutoffRank: number
  isGhost: boolean
  isSimulated: boolean
  isCompact: boolean
  posColor: string | undefined
  tipColor: string
  voteAccount: string
  onClearValidator?: (voteAccount: string) => void
}>(
  ({
    rank,
    cutoffRank,
    isGhost,
    isSimulated,
    isCompact,
    posColor: _posColor,
    tipColor: _tipColor,
    voteAccount,
    onClearValidator,
  }) => {
    // Primary: absolute 1-based stake-priority rank from the top.
    const rankLabel = `#${rank}`
    // Sub: cutoff-relative position. No # prefix here — the # lives only on
    // the primary rank. NBSP binds the count to the word so it never wraps.
    const cutoffWord =
      cutoffRank === 0 ? 'at cutoff' : cutoffRank > 0 ? 'above' : 'below'
    const rankSubLabel =
      cutoffRank === 0 ? 'at cutoff' : `${Math.abs(cutoffRank)} ${cutoffWord}`
    if (isGhost)
      return (
        <span
          className={`text-muted-foreground ${RANK_MONO} flex flex-col items-center gap-0`}
        >
          <span className={isCompact ? 'text-xs' : 'text-base'}>
            {rankLabel}
          </span>
          {!isCompact && (
            <span className="text-2xs opacity-60 font-normal leading-tight">
              {rankSubLabel}
            </span>
          )}
        </span>
      )
    if (isSimulated && onClearValidator)
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`font-medium font-mono ${isCompact ? 'text-xs' : 'text-base'}`}
            style={{ color: 'var(--muted-foreground)' }}
          >
            {rankLabel}
          </span>
          <Tooltip content="Remove from simulation">
            <button
              className="text-xs text-muted-foreground hover:text-destructive leading-none cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                onClearValidator(voteAccount)
              }}
            >
              ✕
            </button>
          </Tooltip>
        </div>
      )
    return (
      <span
        className={`font-medium ${RANK_MONO} flex flex-col items-center gap-0 text-muted-foreground`}
      >
        <span className={isCompact ? 'text-xs' : 'text-base'}>{rankLabel}</span>
        {!isCompact && (
          <span className="text-2xs opacity-60 font-normal text-muted-foreground leading-tight">
            {rankSubLabel}
          </span>
        )}
      </span>
    )
  },
)

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult,
  epochsPerYear,
  dsSamConfig,
  level,
  isCompact = true,
  simulatedValidators = EMPTY_SIMULATED_SET,
  isCalculating,
  validatorMeta,
  onValidatorClick,
  onValidatorSearch,
  onClearValidator,
}) => {
  const winningTotalPmpe = auctionResult.winningTotalPmpe
  const priorityFrontierPmpe =
    selectRedelegationPriorityFrontierPmpe(auctionResult)
  const {
    auctionData: { validators },
  } = auctionResult
  const samDistributedStake = useMemo(
    () => selectSamDistributedStake(validators),
    [validators],
  )
  const winningAPY = useMemo(
    () => selectWinningAPY(auctionResult, epochsPerYear),
    [auctionResult, epochsPerYear],
  )
  const projectedApy = useMemo(
    () => selectProjectedAPY(auctionResult, epochsPerYear),
    [auctionResult, epochsPerYear],
  )
  const concentration = useMemo(
    () => buildConcentrationBreakdown(auctionResult, dsSamConfig),
    [auctionResult, dsSamConfig],
  )

  const [flashId, setFlashId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const flashTimeoutRef = useRef<number | null>(null)

  const handleGhostClick = useCallback((voteAccount: string) => {
    const root = tableRef.current
    if (!root) return
    const target = root.querySelector<HTMLElement>(
      `[data-vote-account="${voteAccount}"]:not([data-ghost="true"])`,
    )
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current)
    setFlashId(voteAccount)
    flashTimeoutRef.current = window.setTimeout(() => setFlashId(null), 800)
  }, [])

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('maxApy')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(column)
        setSortDirection('desc')
      }
    },
    [sortColumn],
  )

  // Current validators with bond health and expected stake change computed
  const validatorsWithBond: ValidatorWithBondState[] = useMemo(
    () =>
      augmentAuctionResult(auctionResult, dsSamConfig.minBondBalanceSol)
        .filter(validator =>
          passesTableFilter(
            validator,
            level ?? 'basic',
            dsSamConfig.minBondBalanceSol,
          ),
        )
        .map(validator => {
          const bondCoverage = computeBondCoverage(
            validator,
            dsSamConfig,
            winningTotalPmpe,
          )
          return {
            ...validator,
            bondCoverage,
            bondHealth: bondHealthFromAuction(
              validator,
              dsSamConfig,
              winningTotalPmpe,
              bondCoverage,
            ),
          }
        }),
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
      orig => {
        const bondCoverage = computeBondCoverage(
          orig,
          dsSamConfig,
          winningTotalPmpe,
        )
        return {
          ...orig,
          bondCoverage,
          bondHealth: bondHealthFromAuction(
            orig,
            dsSamConfig,
            winningTotalPmpe,
            bondCoverage,
          ),
        } as ValidatorWithBondState
      },
    )
  }, [
    sortedValidators,
    changedValidators,
    originalAuctionResult,
    originalPositionsMap,
  ])

  // Cutoff partition: who would clear the bid threshold by yield, regardless
  // of whether the auction actually allocated them target stake. Bid-eligible
  // bond-blocked validators belong above the line; only validators whose max
  // APY is below the winning APY belong below.
  const { winningValidators, aboveCutoff, belowCutoff } = useMemo(() => {
    const winning: typeof allDisplayValidators = []
    const above: typeof allDisplayValidators = []
    const below: typeof allDisplayValidators = []
    for (const row of allDisplayValidators) {
      if (row.isGhost) {
        above.push(row)
        continue
      }
      if (row.validator.auctionStake.marinadeSamTargetSol > 0) {
        winning.push(row)
      }
      if (selectMaxAPY(row.validator, epochsPerYear) >= winningAPY) {
        above.push(row)
      } else {
        below.push(row)
      }
    }
    return {
      winningValidators: winning,
      aboveCutoff: above,
      belowCutoff: below,
    }
  }, [allDisplayValidators, epochsPerYear, winningAPY])
  const aboveCount = aboveCutoff.filter(row => !row.isGhost).length
  // Matches psr.marinade.finance: TVL − Σ active = liquid reserve free to
  // redelegate next epoch (no Solana cooldown wait). Not the SDK's gross
  // projected inflow — that can exceed the reserve via cooldown reactivation
  // and would over-state what's actually deployable next epoch.
  const totalRedelegation = useMemo(
    () => selectRedelegationBudget(auctionResult),
    [auctionResult],
  )

  // Stats for the stats bar
  const winningCount = winningValidators.length

  // SAM-eligible universe for the "Winning Validators" stat: any validator
  // whose bond meets the SDK's minBondBalanceSol threshold. Independent of
  // the Basic-mode table filter, so "X / Y" reads as the auction outcome
  // rather than "X of Y rows we chose to render".
  const bondEligibleValidators = useMemo(
    () =>
      auctionResult.auctionData.validators.filter(
        v =>
          (v.bondBalanceSol ?? 0) > 0 &&
          (v.bondBalanceSol ?? 0) >= dsSamConfig.minBondBalanceSol,
      ),
    [auctionResult, dsSamConfig.minBondBalanceSol],
  )
  const eligibleCount = bondEligibleValidators.length
  const eligibleWinningCount = useMemo(
    () =>
      bondEligibleValidators.filter(
        v => v.auctionStake.marinadeSamTargetSol > 0,
      ).length,
    [bondEligibleValidators],
  )

  const dp = docsPath(level)

  const stats = useMemo(
    () => [
      {
        label: 'Re-delegation',
        value: sol(totalRedelegation, 0),
        unit: 'SOL',
        help: 'Roughly how much SOL Marinade will redelegate into under-stake validators next epoch, pushing them toward their target allocation.',
        guideTo: `${dp}#redelegation`,
      },
      {
        label: 'Winning APY',
        value: pct(winningAPY, 2),
        unit: '',
        help: HELP_TEXT.winningApy,
        guideTo: `${dp}#last-price`,
      },
      {
        label: 'Projected APY',
        value: pct(projectedApy, 2),
        unit: '',
        help: HELP_TEXT.projectedApy,
        guideTo: `${dp}#sam`,
      },
      {
        label: 'Winning Validators',
        value: `${eligibleWinningCount}`,
        unit: ` /${eligibleCount}`,
        help: HELP_TEXT.winningValidators,
        guideTo: `${dp}#sam`,
      },
      {
        label: 'Total Auction Stake',
        value: sol(samDistributedStake, 0),
        unit: 'SOL',
        help: HELP_TEXT.totalAuctionStake,
        guideTo: `${dp}#sam`,
      },
    ],
    [
      totalRedelegation,
      winningAPY,
      projectedApy,
      eligibleWinningCount,
      eligibleCount,
      samDistributedStake,
      dp,
    ],
  )

  const renderRow = useCallback(
    (validator: ValidatorWithBondState, index: number, isGhost = false) => {
      const voteAccount = selectVoteAccount(validator)
      const inSet = validator.auctionStake.marinadeSamTargetSol > 0
      const origAuctionRank = originalAuctionRankMap?.get(voteAccount) ?? null
      const rank = isGhost
        ? (origAuctionRank ?? index + 1)
        : (auctionRankMap.get(voteAccount) ?? index + 1)
      const cutoffRank = validator.values.cutoffRank ?? rank
      const isSimulated = simulatedValidators.has(voteAccount)

      // Position change for simulated rows — compare original vs new auction rank
      const posChange =
        isSimulated && !isGhost
          ? getPositionChange(origAuctionRank, rank)
          : null
      const posColor =
        posChange?.direction === 'improved'
          ? CSS_STATUS_GREEN
          : posChange?.direction === 'worsened'
            ? CSS_DESTRUCTIVE
            : undefined

      // Bond health
      const bondUtilPct = bondUtilizationPct(
        validator,
        dsSamConfig.minBondEpochs,
      )
      const bondHealth = validator.bondHealth
      const bondChip = BOND_CHIP[bondHealth]
      const bondRunway = effectiveBondRunway(validator, bondHealth)
      const hasAlert = bondRunway <= 5 || bondUtilPct >= 85
      const bondScaleMax = bondGaugeScaleMax(dsSamConfig)
      const bondCritical = bondCriticalFrac(dsSamConfig)

      const expectedChange = selectExpectedStakeChange(validator)

      // Tip
      const tip = getValidatorTip(
        validator,
        dsSamConfig,
        winningTotalPmpe,
        validator.bondCoverage,
        auctionResult.auctionData.blacklist,
        priorityFrontierPmpe,
      )
      const tipStyle = getTipStyle(tip.urgency)

      // Max APY
      const maxApy = selectMaxAPY(validator, epochsPerYear)

      const validatorName =
        validatorMeta?.get(voteAccount)?.name ?? `${voteAccount.slice(0, 8)}...`

      const isFlashing = !isGhost && flashId === voteAccount
      const ghostHasTarget = isGhost && isSimulated

      const rowClasses = [
        'group border-b border-border-grid transition-colors duration-[120ms]',
        isGhost
          ? ghostHasTarget
            ? 'opacity-40 line-through bg-muted/30 cursor-pointer hover:opacity-60'
            : 'opacity-40 line-through bg-muted/30 cursor-default'
          : 'bg-card cursor-pointer',
        !isGhost && !inSet && 'bg-destructive/[0.02]',
        !isGhost && inSet && 'hover:bg-primary-light',
        !isGhost && !inSet && 'hover:bg-destructive/[0.05]',
        !isGhost && isSimulated && 'ring-2 ring-inset ring-status-yellow',
        isFlashing && 'bg-status-yellow-light',
      ]
        .filter(Boolean)
        .join(' ')

      return (
        <TableRow
          key={isGhost ? `${voteAccount}-ghost` : voteAccount}
          className={rowClasses}
          data-vote-account={voteAccount}
          data-ghost={isGhost ? 'true' : undefined}
          role={isGhost ? (ghostHasTarget ? 'button' : undefined) : 'button'}
          tabIndex={isGhost ? (ghostHasTarget ? 0 : -1) : 0}
          aria-label={
            isGhost
              ? ghostHasTarget
                ? `Scroll to new position of ${validatorName}`
                : undefined
              : `Open detail for ${validatorName}`
          }
          onClick={() => {
            if (isGhost) {
              if (ghostHasTarget) handleGhostClick(voteAccount)
              return
            }
            onValidatorClick(voteAccount)
          }}
          onKeyDown={e => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            if (isGhost) {
              if (!ghostHasTarget) return
              e.preventDefault()
              handleGhostClick(voteAccount)
              return
            }
            e.preventDefault()
            onValidatorClick(voteAccount)
          }}
        >
          {/* Rank / ✕ */}
          <TableCell className="px-3.5 py-3 text-center w-10">
            <RankCell
              rank={rank}
              cutoffRank={cutoffRank}
              isGhost={isGhost}
              isSimulated={isSimulated}
              isCompact={isCompact}
              posColor={posColor}
              tipColor={tipStyle.color}
              voteAccount={voteAccount}
              onClearValidator={onClearValidator}
            />
          </TableCell>

          {/* Validator */}
          <TableCell className="px-3.5 py-3 w-[240px]">
            <ValidatorIdentity
              name={validatorName}
              voteAccount={voteAccount}
              responsive
              compact={isCompact}
              trailing={
                <>
                  {hasAlert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 animate-pulse" />
                  )}
                  {!isGhost && (
                    <PenaltyBadges
                      validator={validator}
                      dsSamConfig={dsSamConfig}
                      winningTotalPmpe={winningTotalPmpe}
                    />
                  )}
                </>
              }
            />
          </TableCell>

          {/* Max APY */}
          <TableCell className="px-3.5 py-3">
            <span className="font-normal text-xs font-mono text-foreground">
              {pct(maxApy, 2)}
            </span>
          </TableCell>

          {/* Bond Health */}
          <TableCell className="px-3.5 py-3">
            {isCompact ? (
              <span
                className="text-sm font-mono text-muted-foreground"
                title={bondChip.label}
              >
                {stake(selectBondSize(validator) ?? 0)}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground text-sm font-mono">
                  {stake(selectBondSize(validator) ?? 0)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-xs font-medium',
                    bondChip.chip,
                  )}
                >
                  <span
                    className={cn('w-[7px] h-[7px] rounded-full', bondChip.dot)}
                  />
                  {bondChip.label}
                </span>
              </div>
            )}
            {!isCompact && (
              <div className="flex items-center gap-1.5">
                <Gauge
                  size="sm"
                  value={bondRunway}
                  scaleMax={bondScaleMax}
                  marker={bondCritical}
                  criticalBand={bondCritical}
                  tone="bg-muted-foreground/40"
                />
                <span className="text-xs opacity-60 font-mono whitespace-nowrap text-muted-foreground">
                  (
                  {Math.round(bondRunway) >= 100
                    ? '>100'
                    : Math.round(bondRunway)}
                  ep)
                </span>
              </div>
            )}
          </TableCell>

          {/* Stake / Next change */}
          <TableCell className="px-3.5 py-3">
            {isCompact ? (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs font-mono">
                  {stake(validator.marinadeActivatedStakeSol)}
                </span>
                {(() => {
                  const count = stakeArrowCount(expectedChange)
                  if (count === 0) return null
                  const isUp = expectedChange > 0
                  return (
                    <span
                      className="inline-flex items-center gap-[1px]"
                      style={{
                        color: isUp ? CSS_STATUS_GREEN : CSS_DESTRUCTIVE,
                      }}
                    >
                      {Array.from({ length: count }, (_, i) => (
                        <span key={i} className="inline-flex">
                          {isUp ? ICON_ARROW_UP_SM : ICON_ARROW_DOWN_SM}
                        </span>
                      ))}
                    </span>
                  )
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs font-mono">
                  {stake(validator.marinadeActivatedStakeSol)}
                </span>
                {(() => {
                  const cell = nextStakeDeltaCell(expectedChange)
                  return (
                    <span
                      className={cn(
                        'font-mono text-xs',
                        cell.tone === 'neutral'
                          ? TEXT_MUTED
                          : 'font-semibold text-sm',
                      )}
                      style={
                        cell.tone === 'neutral'
                          ? undefined
                          : {
                              color:
                                cell.tone === 'positive'
                                  ? CSS_STATUS_GREEN
                                  : CSS_DESTRUCTIVE,
                            }
                      }
                    >
                      {cell.prefix}
                      {stake(expectedChange)}
                    </span>
                  )
                })()}
              </div>
            )}
          </TableCell>

          {/* Next Step — icon = constraint/direction, color = severity.
            The contiguous out-of-set "Bid too low" block is an EXPECTED
            state, not an alarm: render it muted with a 2-word label;
            the full sentence lives in the detail panel. */}
          {(() => {
            const bidTooLow = tip.constraint === 'rank'
            const stepColor = bidTooLow ? CSS_MUTED_FG : tipStyle.color
            const stepBg = bidTooLow ? CSS_MUTED : tipStyle.bg
            const stepText = bidTooLow
              ? 'Bid too low — raise it.'
              : trimTipDecimals(tip.text)
            return (
              <TableCell className="px-3.5 py-3">
                <div
                  className="inline-flex items-center gap-[5px] text-xs leading-[1.35] px-2.5 py-1 rounded-md max-w-[420px] border"
                  style={{
                    background: stepBg,
                    color: stepColor,
                    borderColor: stepColor,
                  }}
                >
                  <span className="shrink-0 inline-flex items-center justify-center w-4 h-4">
                    {TIP_ICONS[getTipIcon(tip)]}
                  </span>
                  <span className="break-words whitespace-pre-line">
                    {stepText}
                  </span>
                </div>
              </TableCell>
            )
          })()}

          {/* Chevron */}
          <TableCell className="px-2.5 py-3 w-10">
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center border bg-secondary border-border text-secondary-foreground group-hover:bg-primary-light group-hover:border-primary/30 group-hover:text-primary transition-all duration-[120ms]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 3L7.5 6L4.5 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </TableCell>
        </TableRow>
      )
    },
    [
      originalAuctionRankMap,
      auctionRankMap,
      simulatedValidators,
      dsSamConfig,
      winningTotalPmpe,
      auctionResult,
      priorityFrontierPmpe,
      epochsPerYear,
      validatorMeta,
      flashId,
      isCompact,
      handleGhostClick,
      onValidatorClick,
      onClearValidator,
    ],
  )

  const inSimulation = simulatedValidators.size > 0

  return (
    <div
      className={cn(
        'w-full',
        isCalculating && 'opacity-70 pointer-events-none',
      )}
    >
      <div className="max-w-[1920px] mx-auto">
        {/* Headline metrics — grid: 3 cols → 4 cols → 7 cols (1 row) */}
        <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 mt-3 mb-3 px-4">
          {stats
            .filter(
              stat =>
                !isCompact ||
                [
                  'Re-delegation',
                  'Winning APY',
                  'Total Auction Stake',
                ].includes(stat.label),
            )
            .map(stat => (
              <Card
                key={stat.label}
                className="px-3 py-3 sm:px-5 sm:py-4 overflow-hidden flex flex-col"
              >
                <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  {stat.help ? (
                    <HelpTip text={stat.help} guideTo={stat.guideTo}>
                      {stat.label}
                    </HelpTip>
                  ) : (
                    stat.label
                  )}
                </div>
                <div className="mt-auto flex items-baseline gap-0.5 min-w-0 overflow-hidden">
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
          {!isCompact && (
            <ConcentrationMetric
              label="Top Country"
              rows={concentration.countries}
              capPct={concentration.countryCapPct}
              help="Share of auction-distributed stake by validator country. Bar fills against the per-country cap. A 'capped' tag means at least one validator was cut by the cap."
              guideTo={`${dp}#concentration`}
            />
          )}
          {!isCompact && (
            <ConcentrationMetric
              label="Top ASO"
              rows={concentration.asos}
              capPct={concentration.asoCapPct}
              help="Share of auction-distributed stake by ASO — the Autonomous System Operator hosting the validator. Bar fills against the per-ASO cap. A 'capped' tag means at least one validator was cut by the cap."
              guideTo={`${dp}#concentration`}
            />
          )}
        </div>

        {/* Ring wraps only search + table — not the metrics above */}
        <div
          className={cn(
            'mx-4 mb-4',
            inSimulation && 'ring-4 ring-status-yellow rounded-xl',
          )}
        >
          {/* Search row — sits above the table, aligned with validator column */}
          {onValidatorSearch && (
            <div className={cn('mb-4 flex', inSimulation ? 'px-0 pt-2' : '')}>
              <ValidatorSearch
                validators={validators}
                nameMap={validatorMeta ?? EMPTY_NAME_MAP}
                onSelect={onValidatorSearch}
                className="ml-10 w-[240px]"
              />
            </div>
          )}

          {/* Table */}
          <div
            ref={tableRef}
            className="bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto"
          >
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
                    className="px-3.5 py-[11px] text-left text-xs font-medium tracking-[0.05em] bg-muted w-[240px] cursor-pointer hover:text-primary"
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
                      <HelpTip
                        text={HELP_TEXT.maxApy}
                        guideTo={`${dp}#cpmpe`}
                      />
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
                      <HelpTip
                        text={HELP_TEXT.bondHealth}
                        guideTo={`${dp}#bond`}
                      />
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
                      <HelpTip
                        text="How much stake you have right now, and how much it'll change next epoch. Gains depend on fresh deposits coming in; losses come from regular withdrawals, which Marinade pulls from the most over-stake validators first."
                        guideTo={`${dp}#redelegation`}
                      />
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
                          Winning APY: {pct(winningAPY, 2)}
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
    </div>
  )
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { formatPercentage, formatSolAmount } from 'src/format'
import { cn } from 'src/lib/utils'
import {
  selectBid,
  selectBondSize,
  selectCommission,
  selectEffectiveBid,
  selectConstraintText,
  selectMaxAPY,
  selectMevCommission,
  selectSamDistributedStake,
  selectSamTargetStake,
  selectVoteAccount,
  selectWinningAPY,
  selectProjectedAPY,
  selectStakeToMove,
  selectTotalActiveStake,
  selectSamActiveStake,
  bondHealthColor,
  bondTooltip,
  selectProductiveStake,
  selectIsNonProductive,
  selectTargetProtectedPct,
  selectActuallyUnprotectedStake,
  selectBlockRewardsCommission,
  formattedMevCommission,
  formattedBlockRewardsCommission,
  selectFormattedInBondCommission as formattedInBondCommission,
  formattedOnChainMevCommission,
  formattedInBondMevCommission,
  formattedOnChainCommission,
  selectMevCommissionPmpe,
  selectCommissionPmpe,
  selectBlockRewardsCommissionPmpe,
  overridesCommissionMessage,
  overridesBlockRewardsCommissionMessage,
  overridesMevCommissionMessage,
  overridesCpmpeMessage as overridesBidCpmpeMessage,
  selectBondBid,
  getRecommendation,
  isoToFlag,
  selectStakeDelta,
  lastCapConstraintDescription,
} from 'src/services/sam'

import { tooltipAttributes } from '../../services/utils'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import {
  Alignment,
  Color,
  OrderDirection,
  Table,
  TRUNCATED_CELL,
} from '../table/table'

import type { Order } from '../table/table'
import type {
  AuctionResult,
  AuctionValidator,
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'

type ValidatorWithBondState = AuctionValidator & { bondState: Color }
type DisplayValidator = { validator: ValidatorWithBondState; isGhost: boolean }
type EditField =
  | 'inflationCommission'
  | 'mevCommission'
  | 'blockRewardsCommission'
  | 'bidPmpe'

type InputOpts = {
  step: string
  min: string
  max?: string
  placeholder?: string
}

export type ValidatorMeta = {
  name?: string
  countryIso?: string | null
  rank?: number
}

type Props = {
  auctionResult: AuctionResult
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  level: UserLevel
  simulationModeActive: boolean
  editingValidator: string | null
  simulatedValidator: string | null
  isCalculating: boolean
  pendingEdits: PendingEdits
  validatorMeta?: Map<string, ValidatorMeta>
  onValidatorClick: (voteAccount: string) => void
  onFieldChange: (field: EditField, value: string) => void
  onRunSimulation: () => void
  onCancelEditing: () => void
  onToggleSimulation: () => void
}

const CLICKABLE_ROW =
  'validatorRowClickable cursor-pointer hover:bg-primary-alpha'
const GHOST_ROW =
  'ghostRow cursor-default! pointer-events-none [&_td]:line-through [&_td]:text-muted-foreground [&_td]:bg-cell-grey! [&_td_span]:line-through [&_td_div]:line-through'

const bondDotColor: Record<string, string> = {
  [Color.GREEN]: 'bg-status-green',
  [Color.YELLOW]: 'bg-status-yellow',
  [Color.RED]: 'bg-status-red',
}

function bondDotClass(color: Color): string {
  return bondDotColor[color] ?? 'bg-status-grey'
}

function renderEditableCell(
  isEditing: boolean,
  displayValue: string,
  field: EditField,
  inputValue: string,
  onFieldChange: (field: EditField, value: string) => void,
  onRunSimulation: () => void,
  onCancelEditing: () => void,
  opts: InputOpts,
): JSX.Element {
  if (!isEditing) {
    return <>{displayValue}</>
  }
  return (
    <div className="relative inline-block">
      <span className="invisible">{displayValue}</span>
      <Input
        type="number"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[50px] h-auto px-1 py-0.5 text-xs text-right [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
        value={inputValue}
        step={opts.step}
        min={opts.min}
        max={opts.max}
        placeholder={opts.placeholder}
        onChange={e => onFieldChange(field, e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onRunSimulation()
          } else if (e.key === 'Escape') {
            onCancelEditing()
          }
        }}
      />
    </div>
  )
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  tvlJoinApyDiff,
  tvlLeaveApyDiff,
  backstopDiff,
  backstopTvl,
  originalAuctionResult,
  epochsPerYear,
  level,
  simulationModeActive,
  editingValidator,
  simulatedValidator,
  isCalculating,
  pendingEdits,
  validatorMeta,
  onValidatorClick,
  onFieldChange,
  onRunSimulation,
  onCancelEditing,
  onToggleSimulation,
}) => {
  const {
    auctionData: { validators },
  } = auctionResult
  const samDistributedStake = Math.round(selectSamDistributedStake(validators))
  const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)
  const projectedApy = selectProjectedAPY(auctionResult, epochsPerYear)
  const stakeToMove = selectStakeToMove(auctionResult) / samDistributedStake
  const activeStake =
    selectTotalActiveStake(auctionResult) / samDistributedStake
  const productiveStake =
    selectProductiveStake(auctionResult) / samDistributedStake
  const targetProtectedPct = selectTargetProtectedPct(auctionResult)
  const unprotectedStake = selectActuallyUnprotectedStake(auctionResult)

  const tableWrapRef = useRef<HTMLDivElement>(null)

  const [copiedVa, setCopiedVa] = useState<string | null>(null)

  const handleCopy = useCallback((e: React.MouseEvent, voteAccount: string) => {
    e.stopPropagation()
    void navigator.clipboard.writeText(voteAccount)
    setCopiedVa(voteAccount)
    setTimeout(() => setCopiedVa(null), 1500)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingValidator) {
        onCancelEditing()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingValidator, onCancelEditing])

  useEffect(() => {
    if (!editingValidator) {
      return undefined
    }
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

  const allValidators: ValidatorWithBondState[] = useMemo(
    () =>
      validators.map(v => ({
        ...v,
        bondState: bondHealthColor(v),
      })),
    [validators],
  )

  const hasDataChanged = useMemo(() => {
    if (!simulatedValidator || !originalAuctionResult) return false
    const orig = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === simulatedValidator,
    )
    const sim = validators.find(v => v.voteAccount === simulatedValidator)
    if (!orig || !sim) return false
    return (
      orig.inflationCommissionDec !== sim.inflationCommissionDec ||
      orig.mevCommissionDec !== sim.mevCommissionDec ||
      orig.blockRewardsCommissionDec !== sim.blockRewardsCommissionDec ||
      orig.revShare.bidPmpe !== sim.revShare.bidPmpe
    )
  }, [simulatedValidator, originalAuctionResult, validators])

  const samStakeValidators = allValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol,
  )
  const avgStake =
    samStakeValidators.reduce(
      (s, v) => s + v.auctionStake.marinadeSamTargetSol,
      0,
    ) / samStakeValidators.length

  const inputVal = (field: keyof PendingEdits, fallback: string) =>
    pendingEdits[field] ?? fallback

  const defaultOrder: Order[] = useMemo(
    () =>
      level === UserLevel.Expert
        ? [[7, OrderDirection.DESC]]
        : [[3, OrderDirection.DESC]],
    [level],
  )

  const [currentOrder, setCurrentOrder] = useState<Order[]>(defaultOrder)

  const handleOrderChange = useCallback((order: Order[]) => {
    setCurrentOrder(order)
  }, [])

  const compareByColumn = useCallback(
    (a: AuctionValidator, b: AuctionValidator, columnIndex: number): number => {
      if (level === UserLevel.Expert) {
        switch (columnIndex) {
          case 0:
            return selectVoteAccount(a).localeCompare(selectVoteAccount(b))
          case 1:
            return selectCommission(a) - selectCommission(b)
          case 2:
            return (
              (selectMevCommission(a) ?? 100) - (selectMevCommission(b) ?? 100)
            )
          case 3:
            return (
              (selectBlockRewardsCommission(a) ?? 100) -
              (selectBlockRewardsCommission(b) ?? 100)
            )
          case 4:
            return selectBid(a) - selectBid(b)
          case 5:
            return selectBondSize(a) - selectBondSize(b)
          case 6:
            return (
              selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
            )
          case 7:
            return selectSamTargetStake(a) - selectSamTargetStake(b)
          case 8:
            return selectEffectiveBid(a) - selectEffectiveBid(b)
          case 9:
            return selectConstraintText(a).localeCompare(
              selectConstraintText(b),
            )
          default:
            return 0
        }
      }
      switch (columnIndex) {
        case 0: {
          const nameA = validatorMeta?.get(selectVoteAccount(a))?.name ?? ''
          const nameB = validatorMeta?.get(selectVoteAccount(b))?.name ?? ''
          return nameA.localeCompare(nameB)
        }
        case 1:
          return selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        case 2:
          return selectBondSize(a) - selectBondSize(b)
        case 3:
          return selectSamTargetStake(a) - selectSamTargetStake(b)
        default:
          return 0
      }
    },
    [epochsPerYear, level],
  )

  const originalPositionsMap = useMemo(() => {
    if (!originalAuctionResult) {
      return null
    }

    const originalValidators = originalAuctionResult.auctionData.validators

    const sorted = [...originalValidators].sort((a, b) => {
      for (const [columnIndex, orderDirection] of currentOrder) {
        const result = compareByColumn(a, b, columnIndex)
        if (result !== 0) {
          return orderDirection === OrderDirection.ASC ? result : -result
        }
      }
      return 0
    })

    const map = new Map<string, number>()
    sorted.forEach((v, i) => map.set(v.voteAccount, i + 1))
    return map
  }, [originalAuctionResult, currentOrder, compareByColumn])

  const getOriginalPosition = (voteAccount: string): number | null =>
    originalPositionsMap?.get(voteAccount) ?? null

  const getPositionChangeClass = (
    voteAccount: string,
    currentPosition: number,
  ): string | null => {
    const orig = getOriginalPosition(voteAccount)
    if (orig === null) {
      return null
    }
    const delta = Math.abs(currentPosition - orig)
    if (currentPosition < orig) {
      if (delta >= 5) return 'positionImproved [&_td]:bg-status-green/[0.35]'
      if (delta >= 3) return 'positionImproved [&_td]:bg-status-green/[0.22]'
      return 'positionImproved [&_td]:bg-status-green/[0.12]'
    }
    if (currentPosition > orig) {
      if (delta >= 5) return 'positionWorsened [&_td]:bg-status-red/[0.35]'
      if (delta >= 3) return 'positionWorsened [&_td]:bg-status-red/[0.22]'
      return 'positionWorsened [&_td]:bg-status-red/[0.12]'
    }
    return 'positionUnchanged [&_td]:bg-muted-foreground/[0.12]'
  }

  const sortedValidators = useMemo(
    () =>
      [...allValidators].sort((a, b) => {
        for (const [columnIndex, orderDirection] of currentOrder) {
          const result = compareByColumn(a, b, columnIndex)
          if (result !== 0) {
            return orderDirection === OrderDirection.ASC ? result : -result
          }
        }
        return 0
      }),
    [allValidators, currentOrder, compareByColumn],
  )

  const displayValidators: DisplayValidator[] = useMemo(() => {
    const display: DisplayValidator[] = sortedValidators.map(v => ({
      validator: v,
      isGhost: false,
    }))

    if (simulatedValidator && hasDataChanged && originalAuctionResult) {
      const orig = originalAuctionResult.auctionData.validators.find(
        v => v.voteAccount === simulatedValidator,
      )
      if (orig) {
        const originalValidator = { ...orig, bondState: bondHealthColor(orig) }
        const originalPosition = getOriginalPosition(simulatedValidator)
        const currentSimulatedIndex = display.findIndex(
          d => d.validator.voteAccount === simulatedValidator,
        )
        if (originalPosition !== null && originalPosition > 0) {
          const adjustedOriginalPos = originalPosition - 1
          const insertIndex = Math.min(
            currentSimulatedIndex === adjustedOriginalPos
              ? currentSimulatedIndex + 1
              : adjustedOriginalPos,
            display.length,
          )
          display.splice(insertIndex, 0, {
            validator: originalValidator,
            isGhost: true,
          })
        }
      }
    }

    return display
  }, [
    sortedValidators,
    simulatedValidator,
    hasDataChanged,
    originalAuctionResult,
    getOriginalPosition,
  ])

  const fmtDiff = (d: number) => `${d >= 0 ? '+' : ''}${formatPercentage(d, 2)}`

  let expertMetrics
  let apyMetrics
  if (level === UserLevel.Expert) {
    expertMetrics = (
      <>
        <Metric
          label="Stake to Move"
          value={`${formatPercentage(stakeToMove)}`}
          {...tooltipAttributes(
            'Percentage of total auction stake that needs to be redistributed to match the current auction target. High values mean on-chain delegation diverges significantly from the target distribution.',
          )}
        />
        <Metric
          label="Active Stake"
          value={`${formatPercentage(activeStake)}`}
          {...tooltipAttributes(
            'Ratio of currently activated stake vs total SAM target stake. Less than 100% means some distributed stake is still in the activation queue and not yet earning rewards.',
          )}
        />
        <Metric
          label="Productive Stake"
          value={`${formatPercentage(productiveStake)}`}
          {...tooltipAttributes(
            'Ratio of active stake on validators paying ≥90% of the effective bid. Measures how much stake is delegated to validators meeting their revenue commitments.',
          )}
        />
        <Metric
          label="Avg. Stake"
          value={`${formatSolAmount(avgStake, 0)}`}
          {...tooltipAttributes(
            'Average SOL stake per winning validator. Calculated as total auction stake divided by number of winning validators.',
          )}
        />
        <Metric
          label="T. Protected"
          value={formatPercentage(targetProtectedPct)}
          {...tooltipAttributes(
            "Percentage of total SAM target stake backed by validator bond coverage. Unprotected stake is where target stake exceeds the validator's bond capacity.",
          )}
        />
        <Metric
          label="T. Unprotected"
          value={`${formatSolAmount(unprotectedStake, 0)} SOL`}
          {...tooltipAttributes(
            'Total SOL where target stake exceeds validator bond-only capacity. Represents stake lacking bond coverage if validators fail to pay their bids.',
          )}
        />
        <Metric
          label="Conc. Risk"
          value={fmtDiff(backstopDiff)}
          {...tooltipAttributes(
            'APY impact if the top 5 validators by target stake departed. Positive = those validators had below-average bids, APY improves. Negative = they contributed above-average revenue, APY declines.',
          )}
        />
        <Metric
          label="Conc. TVL"
          value={`${formatSolAmount(backstopTvl, 0)} SOL`}
          {...tooltipAttributes(
            'Total target stake concentrated in the top 5 validators by target stake. Complements Conc. Risk by showing absolute SOL exposure to the largest validators.',
          )}
        />
        <Metric
          label="+10% TVL"
          value={fmtDiff(tvlJoinApyDiff)}
          {...tooltipAttributes(
            'APY impact if 10% more TVL enters the pool. Typically negative — more TVL dilutes per-SOL revenue since validators bid the same amount spread over more SOL.',
          )}
        />
        <Metric
          label="-10% TVL"
          value={fmtDiff(tvlLeaveApyDiff)}
          {...tooltipAttributes(
            'APY impact if 10% of TVL leaves the pool. Typically positive — less TVL concentrates per-SOL revenue since same bids are spread over fewer SOL.',
          )}
        />
      </>
    )
    apyMetrics = (
      <Metric
        label="Ideal APY"
        value={formatPercentage(projectedApy / activeStake)}
        {...tooltipAttributes(
          'Expected staker return on stake that is currently active and earning rewards. Divides projected revenue by active stake ratio — higher than Projected APY when some distributed stake is still activating. Assumes no Marinade fees.',
        )}
      />
    )
  } else if (activeStake > 0.9) {
    apyMetrics = (
      <Metric
        label="Projected APY"
        value={formatPercentage(projectedApy)}
        {...tooltipAttributes(
          'Expected staker return based on total revenue from all winning validators at current stake levels. Assumes ~182 epochs/year, no Marinade fees.',
        )}
      />
    )
  }

  const simulationCaption = simulationModeActive ? (
    <div className="px-8 py-4 bg-linear-to-br from-[rgba(5,30,28,1)] to-[rgba(15,50,48,1)] text-primary text-lg font-semibold tracking-wider text-center uppercase rounded-t-xl border-b border-border-grid">
      {isCalculating ? 'Calculating simulation...' : 'Simulation mode active'}
    </div>
  ) : undefined

  const basicTable = (
    <Table
      className="border-separate border-spacing-y-1 border-spacing-x-0 font-sans [&_tbody_tr]:transition-colors [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:align-top [&_tbody_td]:bg-card [&_tbody_td]:border-y [&_tbody_td]:border-border-grid [&_tbody_td:first-child]:rounded-l-xl [&_tbody_td:last-child]:rounded-r-xl [&_tbody_tr:hover_td]:bg-primary-alpha"
      caption={simulationCaption}
      data={displayValidators}
      rowAttrsFn={(item, _index) => {
        const { validator, isGhost } = item
        const va = selectVoteAccount(validator)
        if (isGhost) {
          return {
            className: GHOST_ROW,
          }
        }
        return {
          className: cn(
            CLICKABLE_ROW,
            selectIsNonProductive(validator) && 'rowYellow bg-cell-yellow',
          ),
          onClick: () => onValidatorClick(va),
        }
      }}
      showRowNumber
      rowNumberRender={(item, index) => {
        const { isGhost } = item
        const va = selectVoteAccount(item.validator)
        if (isGhost) {
          return <span>{getOriginalPosition(va) ?? index + 1}</span>
        }
        const realIdx = displayValidators
          .slice(0, index + 1)
          .filter(d => !d.isGhost).length
        return <span>{realIdx}</span>
      }}
      columns={[
        {
          header: 'Validator',
          headerAttrsFn: () => ({ className: 'w-[160px] max-w-[160px]' }),
          cellAttrsFn: () => ({ className: 'w-[160px] max-w-[160px]' }),
          render: item => {
            const va = selectVoteAccount(item.validator)
            const meta = validatorMeta?.get(va)
            const flag = meta?.countryIso ? isoToFlag(meta.countryIso) : ''
            const name = meta?.name ?? va
            const isCopied = copiedVa === va
            const sim = !item.isGhost && simulatedValidator === va
            const rec = getRecommendation(
              item.validator,
              item.validator.bondState,
            )
            return (
              <span className="inline-flex flex-col gap-0.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    sim && 'font-bold italic',
                  )}
                >
                  {flag && <span className="text-sm shrink-0">{flag}</span>}
                  <span className="font-medium">
                    {name.length > 24 ? name.slice(0, 24) + '\u2026' : name}
                  </span>
                  <span
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground hover:underline"
                    onClick={e => handleCopy(e, va)}
                    title={isCopied ? 'Copied!' : 'Click to copy'}
                  >
                    {isCopied
                      ? 'Copied'
                      : va.slice(0, 4) + '\u2026' + va.slice(-4)}
                  </span>
                </span>
                <span
                  className={cn(
                    'text-xs whitespace-normal max-w-[140px]',
                    rec.severity === 'critical' && 'text-status-red',
                    rec.severity === 'warning' && 'text-status-yellow',
                    rec.severity === 'positive' && 'text-status-green',
                    rec.severity === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {rec.text}
                </span>
              </span>
            )
          },
          compare: (a, b) => {
            const nameA =
              validatorMeta?.get(selectVoteAccount(a.validator))?.name ?? ''
            const nameB =
              validatorMeta?.get(selectVoteAccount(b.validator))?.name ?? ''
            return nameA.localeCompare(nameB)
          },
        },
        {
          header: 'Max APY',
          headerAttrsFn: () =>
            tooltipAttributes(
              "APY calculated using this validator's bid and commission configuration.",
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `Infl: ${formattedOnChainCommission(item.validator)}<br/>` +
                `MEV: ${formattedMevCommission(item.validator)}<br/>` +
                `Block: ${formattedBlockRewardsCommission(item.validator)}<br/>` +
                `Bid: ${formatSolAmount(selectBid(item.validator), 4)} SOL`,
            ),
          render: item => (
            <>
              {formatPercentage(
                selectMaxAPY(item.validator, epochsPerYear),
                2,
                0.5,
              )}
            </>
          ),
          compare: (a, b) =>
            selectMaxAPY(a.validator, epochsPerYear) -
            selectMaxAPY(b.validator, epochsPerYear),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Bond',
          headerAttrsFn: () =>
            tooltipAttributes('Bond Balance and health status.'),
          cellAttrsFn: item =>
            tooltipAttributes(bondTooltip(item.validator.bondState)),
          render: item => {
            const { validator } = item
            return (
              <span className="inline-flex items-center gap-1.5">
                {formatSolAmount(selectBondSize(validator), 0)} SOL
                <span
                  className={cn(
                    'bondDot w-2 h-2 rounded-full shrink-0 inline-block',
                    bondDotClass(validator.bondState),
                  )}
                />
              </span>
            )
          },
          compare: (a, b) =>
            selectBondSize(a.validator) - selectBondSize(b.validator),
          alignment: Alignment.RIGHT,
          background: item =>
            selectBondSize(item.validator) <= 0
              ? Color.GREY
              : item.validator.bondState,
        },
        {
          header: 'Stake \u0394',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Change from active to target stake. Sorts by target stake.',
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `Active: ${formatSolAmount(selectSamActiveStake(item.validator), 0)} SOL<br/>` +
                `Target: ${formatSolAmount(selectSamTargetStake(item.validator), 0)} SOL`,
            ),
          render: item => {
            const delta = selectStakeDelta(item.validator)
            const arrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2014'
            return (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  delta > 0 && 'text-status-green',
                  delta < 0 && 'text-status-red',
                  delta === 0 && 'text-status-grey',
                )}
              >
                {delta !== 0 && (delta > 0 ? '+' : '')}
                {formatSolAmount(delta, 0)} {arrow}
              </span>
            )
          },
          compare: (a, b) =>
            selectSamTargetStake(a.validator) -
            selectSamTargetStake(b.validator),
          alignment: Alignment.RIGHT,
        },
      ]}
      defaultOrder={defaultOrder}
      onOrderChange={handleOrderChange}
      presorted
    />
  )

  const expertTable = (
    <Table
      caption={simulationCaption}
      data={displayValidators}
      rowAttrsFn={(item, index) => {
        const { validator, isGhost } = item
        const va = selectVoteAccount(validator)
        if (isGhost) {
          return {
            className: GHOST_ROW,
          }
        }

        const isEditing = editingValidator === va
        const isSimulated = simulatedValidator === va
        const classes: string[] = []
        let onClick: (() => void) | undefined

        if (isSimulated && !isEditing) {
          const realIdx = displayValidators
            .slice(0, index + 1)
            .filter(d => !d.isGhost).length
          classes.push(
            CLICKABLE_ROW,
            getPositionChangeClass(va, realIdx) ||
              'positionUnchanged [&_td]:bg-muted-foreground/[0.12]',
          )
          onClick = () => onValidatorClick(va)
        } else if (simulationModeActive && !isEditing) {
          classes.push(CLICKABLE_ROW)
          onClick = () => onValidatorClick(va)
        } else if (isEditing) {
          classes.push('bg-primary-alpha')
        }

        if (selectIsNonProductive(validator)) {
          classes.push('rowYellow bg-cell-yellow')
        }

        return { className: classes.join(' ') || undefined, onClick }
      }}
      showRowNumber
      rowNumberRender={(item, index) => {
        const { validator, isGhost } = item
        const va = selectVoteAccount(validator)
        if (isGhost) {
          return (
            <div className="relative inline-flex items-center gap-1">
              <span>{getOriginalPosition(va) ?? index + 1}</span>
            </div>
          )
        }
        const realIdx = displayValidators
          .slice(0, index + 1)
          .filter(d => !d.isGhost).length
        const isEditing = editingValidator === va
        return (
          <div className="relative inline-flex items-center gap-1">
            <span>{realIdx}</span>
            {isEditing && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                <Button
                  size="sm"
                  className={cn(
                    'min-w-[60px] h-auto py-[3px] text-[11px] shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
                    isCalculating && 'bg-muted text-muted-foreground',
                  )}
                  onClick={e => {
                    e.stopPropagation()
                    onRunSimulation()
                  }}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Simulating' : 'Simulate'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-auto px-1.5 py-[3px] text-[11px] shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:enabled:bg-destructive hover:enabled:text-destructive-foreground"
                  onClick={e => {
                    e.stopPropagation()
                    onCancelEditing()
                  }}
                  disabled={isCalculating}
                  title="Cancel editing (Esc)"
                >
                  {'\u2715'}
                </Button>
              </div>
            )}
          </div>
        )
      }}
      columns={[
        {
          header: 'Validator',
          headerAttrsFn: () => tooltipAttributes('Validator Vote Account'),
          render: item => {
            const va = selectVoteAccount(item.validator)
            const sim = !item.isGhost && simulatedValidator === va
            return (
              <span className={cn(TRUNCATED_CELL, sim && 'font-bold italic')}>
                {va}
              </span>
            )
          },
          compare: (a, b) =>
            selectVoteAccount(a.validator).localeCompare(
              selectVoteAccount(b.validator),
            ),
        },
        {
          header: 'Infl.',
          headerAttrsFn: () =>
            tooltipAttributes('Validator Inflation Commission'),
          cellAttrsFn: item =>
            tooltipAttributes(
              `${overridesCommissionMessage(item.validator)}` +
                `On chain commission: ${formattedOnChainCommission(item.validator)}<br/>` +
                `In-bond commission: ${formattedInBondCommission(item.validator)}<br/>` +
                `Effective inflation commission bid: ${selectCommissionPmpe(item.validator)}`,
            ),
          render: item => {
            const { validator, isGhost } = item
            const isEditing =
              !isGhost && editingValidator === selectVoteAccount(validator)
            return renderEditableCell(
              isEditing,
              formatPercentage(selectCommission(validator), 0),
              'inflationCommission',
              inputVal(
                'inflationCommission',
                (selectCommission(validator) * 100).toString(),
              ),
              onFieldChange,
              onRunSimulation,
              onCancelEditing,
              { step: '0.1', min: '0', max: '100' },
            )
          },
          compare: (a, b) =>
            selectCommission(a.validator) - selectCommission(b.validator),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'MEV',
          cellAttrsFn: item =>
            tooltipAttributes(
              `${overridesMevCommissionMessage(item.validator)}` +
                `On chain commission: ${formattedOnChainMevCommission(item.validator)}<br/>` +
                `In-bond commission: ${formattedInBondMevCommission(item.validator)}<br/>` +
                `Effective MEV commission bid: ${selectMevCommissionPmpe(item.validator)}`,
            ),
          render: item => {
            const { validator, isGhost } = item
            const isEditing =
              !isGhost && editingValidator === selectVoteAccount(validator)
            const mev = selectMevCommission(validator)
            return renderEditableCell(
              isEditing,
              formattedMevCommission(validator),
              'mevCommission',
              inputVal(
                'mevCommission',
                mev !== null ? (mev * 100).toString() : '',
              ),
              onFieldChange,
              onRunSimulation,
              onCancelEditing,
              { step: '0.1', min: '0', max: '100', placeholder: '-' },
            )
          },
          compare: (a, b) =>
            (selectMevCommission(a.validator) ?? 100) -
            (selectMevCommission(b.validator) ?? 100),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Block',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Block rewards commission can be in Bond configuration solely.',
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `${overridesBlockRewardsCommissionMessage(item.validator)}` +
                `Effective block rewards commission bid: ${selectBlockRewardsCommissionPmpe(item.validator)}`,
            ),
          render: item => {
            const { validator, isGhost } = item
            const isEditing =
              !isGhost && editingValidator === selectVoteAccount(validator)
            const blk = selectBlockRewardsCommission(validator)
            return renderEditableCell(
              isEditing,
              formattedBlockRewardsCommission(validator),
              'blockRewardsCommission',
              inputVal(
                'blockRewardsCommission',
                blk !== null ? (blk * 100).toString() : '',
              ),
              onFieldChange,
              onRunSimulation,
              onCancelEditing,
              { step: '0.1', min: '0', max: '100', placeholder: '-' },
            )
          },
          compare: (a, b) =>
            (selectBlockRewardsCommission(a.validator) ?? 100) -
            (selectBlockRewardsCommission(b.validator) ?? 100),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'St. Bid',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Static bid for 1000 SOL set by the validator in Bond configuration.',
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `${overridesBidCpmpeMessage(item.validator)}` +
                `Maximum bid ${selectBondBid(item.validator)} for 1000 SOL.`,
            ),
          render: item => {
            const { validator, isGhost } = item
            const isEditing =
              !isGhost && editingValidator === selectVoteAccount(validator)
            return renderEditableCell(
              isEditing,
              formatSolAmount(selectBid(validator), 4),
              'bidPmpe',
              inputVal('bidPmpe', selectBid(validator).toString()),
              onFieldChange,
              onRunSimulation,
              onCancelEditing,
              { step: '0.001', min: '0' },
            )
          },
          compare: (a, b) => selectBid(a.validator) - selectBid(b.validator),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Bond [SOL]',
          headerAttrsFn: () => tooltipAttributes('Bond Balance.'),
          cellAttrsFn: item =>
            tooltipAttributes(bondTooltip(item.validator.bondState)),
          render: item => (
            <>{formatSolAmount(selectBondSize(item.validator), 0)}</>
          ),
          compare: (a, b) =>
            selectBondSize(a.validator) - selectBondSize(b.validator),
          alignment: Alignment.RIGHT,
          background: item =>
            selectBondSize(item.validator) <= 0
              ? Color.GREY
              : item.validator.bondState,
        },
        {
          header: 'Max APY',
          headerAttrsFn: () =>
            tooltipAttributes(
              "APY calculated using this validator's bid and commission configuration.",
            ),
          render: item => (
            <>
              {formatPercentage(
                selectMaxAPY(item.validator, epochsPerYear),
                2,
                0.5,
              )}
            </>
          ),
          compare: (a, b) =>
            selectMaxAPY(a.validator, epochsPerYear) -
            selectMaxAPY(b.validator, epochsPerYear),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Stake \u0394 [SOL]',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Change from active to target stake (target \u2212 active). Sorts by target stake.',
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `Active: ${formatSolAmount(selectSamActiveStake(item.validator), 0)} SOL<br/>` +
                `Target: ${formatSolAmount(selectSamTargetStake(item.validator), 0)} SOL`,
            ),
          render: item => {
            const delta = selectStakeDelta(item.validator)
            return (
              <>
                {delta > 0 ? '+' : ''}
                {formatSolAmount(delta, 0)}
              </>
            )
          },
          compare: (a, b) =>
            selectSamTargetStake(a.validator) -
            selectSamTargetStake(b.validator),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Eff. Bid [SOL]',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Effective bid used in the auction calculation, combining the static bid and commission settings. ' +
                'This value is used to rank validators in the auction and is shown as cost per 1000 SOL. ' +
                'It is not the actual amount the validator will pay from the bond, as that depends on the real stake delegated to the validator for the static bid, ' +
                'and on the rewards earned in the previous epoch for the commission configuration.',
            ),
          render: item => (
            <>{formatSolAmount(selectEffectiveBid(item.validator), 4)}</>
          ),
          compare: (a, b) =>
            selectEffectiveBid(a.validator) - selectEffectiveBid(b.validator),
          alignment: Alignment.RIGHT,
        },
        {
          header: 'Constraint',
          headerAttrsFn: () =>
            tooltipAttributes(
              "The last constraint that capped this validator's stake allocation.",
            ),
          render: item => {
            const { lastCapConstraint } = item.validator
            if (!lastCapConstraint) return <>{'\u2014'}</>
            return <>{lastCapConstraintDescription(lastCapConstraint)}</>
          },
          compare: (a, b) =>
            selectConstraintText(a.validator).localeCompare(
              selectConstraintText(b.validator),
            ),
        },
      ]}
      defaultOrder={defaultOrder}
      onOrderChange={handleOrderChange}
      presorted
    />
  )

  return (
    <div
      ref={tableWrapRef}
      className={cn(
        'relative overflow-x-auto',
        simulationModeActive && [
          '[&_table_tbody]:bg-[rgba(5,30,28,0.08)]',
          '[&_table_tbody_tr]:bg-[rgba(5,30,28,0.06)]',
          '[&_table_thead]:bg-linear-to-br [&_table_thead]:from-[rgba(5,30,28,1)] [&_table_thead]:to-[rgba(15,50,48,1)] [&_table_thead]:transition-[background] [&_table_thead]:duration-[800ms] [&_table_thead]:ease-in-out',
        ],
        isCalculating && 'header-glow',
      )}
    >
      <div className="flex flex-wrap gap-2 p-2.5">
        <Metric
          label="Total Auction Stake"
          value={`${formatSolAmount(samDistributedStake)} SOL`}
          {...tooltipAttributes(
            'Total SOL distributed by Marinade to validators via the SAM last-price auction. All winning validators receive stake up to this amount each epoch.',
          )}
        />
        <Metric
          label="Winning APY"
          value={formatPercentage(winningAPY)}
          {...tooltipAttributes(
            'Estimated APY of the last (marginal) validator to receive stake in this auction. In a last-price auction, all winners pay this clearing rate — not their maximum bid. Assumes ~182 epochs/year, no Marinade fees.',
          )}
        />
        {apyMetrics}
        <Metric
          label="Winning Validators"
          value={
            <div>
              <span>{samStakeValidators.length}</span> /{' '}
              <span>{allValidators.length}</span>
            </div>
          }
          {...tooltipAttributes(
            'Validators currently receiving SAM stake (left) out of all validators tracked (right). Only validators with a funded bond, adequate uptime (>80%), and effective commission ≤7% are eligible.',
          )}
        />
        {expertMetrics}
      </div>

      {level === UserLevel.Expert && (
        <div className="flex justify-end px-2.5 pb-2">
          <Button
            className={cn(
              'simulatorToggle',
              simulationModeActive && 'bg-primary/80 ring-2 ring-primary',
              isCalculating &&
                'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            onClick={onToggleSimulation}
            disabled={isCalculating}
          >
            {simulationModeActive ? 'Exit Simulation' : 'Enter Simulation'}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        {level === UserLevel.Expert ? expertTable : basicTable}
      </div>
    </div>
  )
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatPercentage, formatSolAmount } from 'src/format'
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
} from 'src/services/sam'

import styles from './sam-table.module.css'
import { tooltipAttributes } from '../../services/utils'
import { ComplexMetric } from '../complex-metric/complex-metric'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import { Alignment, Color, OrderDirection, Table } from '../table/table'

import type { Order } from '../table/table'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
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
}

type Props = {
  auctionResult: AuctionResult
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
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
}

function isoToFlag(iso: string): string {
  if (!iso || iso.length !== 2) return ''
  const toRegional = (c: string) =>
    String.fromCodePoint(0x1f1e6 + c.toUpperCase().charCodeAt(0) - 65)
  return toRegional(iso[0]) + toRegional(iso[1])
}

function bondLabel(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return 'Healthy'
    case Color.YELLOW:
      return 'Low'
    case Color.RED:
      return 'Critical'
    default:
      return '—'
  }
}

function bondDotClassName(color: Color): string {
  switch (color) {
    case Color.GREEN:
      return styles.bondDotGreen
    case Color.YELLOW:
      return styles.bondDotYellow
    case Color.RED:
      return styles.bondDotRed
    default:
      return styles.bondDotGrey
  }
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
    <div className={styles.inputCell}>
      <span className={styles.inputPlaceholder}>{displayValue}</span>
      <input
        type="number"
        className={styles.inlineInput}
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
  dsSamConfig,
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
  const stakeToMove = selectStakeToMove(auctionResult) / samDistributedStake
  const activeStake =
    selectTotalActiveStake(auctionResult) / samDistributedStake
  const productiveStake =
    selectProductiveStake(auctionResult) / samDistributedStake
  const targetProtectedPct = selectTargetProtectedPct(auctionResult)
  const unprotectedStake = selectActuallyUnprotectedStake(auctionResult)

  const tableWrapRef = useRef<HTMLDivElement>(null)

  const [density, setDensity] = useState<'compact' | 'expanded'>('compact')
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

  // Expert mode: col 7=Stake Δ (sorts by target), col 8=Eff Bid, col 9=Constraint
  // Basic mode: col 7=SAM Active, col 8=SAM Target
  const defaultOrder: Order[] = useMemo(
    () =>
      level === UserLevel.Expert
        ? [[7, OrderDirection.DESC]]
        : [[8, OrderDirection.DESC]],
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
          return selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        case 7:
          return selectSamActiveStake(a) - selectSamActiveStake(b)
        case 8:
          return selectSamTargetStake(a) - selectSamTargetStake(b)
        case 9:
          return selectEffectiveBid(a) - selectEffectiveBid(b)
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
      if (delta >= 5) return styles.positionImproved3
      if (delta >= 3) return styles.positionImproved2
      return styles.positionImproved1
    }
    if (currentPosition > orig) {
      if (delta >= 5) return styles.positionWorsened3
      if (delta >= 3) return styles.positionWorsened2
      return styles.positionWorsened1
    }
    return styles.positionUnchanged
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
        <div className={styles.metricRow}>
          <Metric
            label="Stake to Move"
            value={`${formatPercentage(stakeToMove)}`}
            {...tooltipAttributes(
              'Stake that has to move to match auction results',
            )}
          />
          <Metric
            label="Active Stake"
            value={`${formatPercentage(activeStake)}`}
            {...tooltipAttributes('Share of active stake earning rewards')}
          />
          <Metric
            label="Productive Stake"
            value={`${formatPercentage(productiveStake)}`}
            {...tooltipAttributes(
              'Share of active stake where bid covers at least 90% of effective bid (accounting for commission)',
            )}
          />
          <Metric
            label="Avg. Stake"
            value={`${formatSolAmount(avgStake, 0)}`}
            {...tooltipAttributes('Average stake per validator')}
          />
        </div>
        <div className={styles.metricRow}>
          <Metric
            label="T. Protected"
            value={formatPercentage(targetProtectedPct)}
            {...tooltipAttributes(
              'Percentage of target delegation covered by bond reserves',
            )}
          />
          <Metric
            label="T. Unprotected"
            value={`☉ ${formatSolAmount(unprotectedStake, 0)}`}
            {...tooltipAttributes('Target delegation beyond bond coverage')}
          />
          <Metric
            label="Conc. Risk"
            value={fmtDiff(backstopDiff)}
            {...tooltipAttributes(
              'APY impact if top 5 validators by target stake left (full auction re-run without them)',
            )}
          />
          <Metric
            label="Conc. TVL"
            value={`☉ ${formatSolAmount(backstopTvl, 0)}`}
            {...tooltipAttributes(
              'Target stake concentrated in top 5 validators',
            )}
          />
          <Metric
            label="+10% TVL"
            value={fmtDiff(tvlJoinApyDiff)}
            {...tooltipAttributes(
              'APY impact if 10% more TVL joins (full auction re-run with increased TVL)',
            )}
          />
          <Metric
            label="-10% TVL"
            value={fmtDiff(tvlLeaveApyDiff)}
            {...tooltipAttributes(
              'APY impact if 10% of TVL leaves (full auction re-run with decreased TVL)',
            )}
          />
        </div>
      </>
    )
    apyMetrics = (
      <Metric
        label="Ideal APY"
        value={`☉ ${formatPercentage(projectedApy / activeStake)}`}
        {...tooltipAttributes(
          'Estimated APY of currently active stake; assumes no Marinade fees; assumes all distributed stake is active',
        )}
      />
    )
  } else if (activeStake > 0.9) {
    apyMetrics = (
      <Metric
        label="Projected APY"
        value={`☉ ${formatPercentage(projectedApy)}`}
        {...tooltipAttributes(
          'Estimated APY of currently active stake; assumes no Marinade fees',
        )}
      />
    )
  }

  const simulationCaption = simulationModeActive ? (
    <div className={styles.simulationBanner}>
      {isCalculating ? 'Calculating simulation...' : 'Simulation mode active'}
    </div>
  ) : undefined

  const renderCardList = () => {
    const cards = displayValidators.map((item, index) => {
      const { validator, isGhost } = item
      const va = selectVoteAccount(validator)
      const meta = validatorMeta?.get(va)
      const flag = meta?.countryIso ? isoToFlag(meta.countryIso) : ''
      const displayName = meta?.name ?? va
      const isCopied = copiedVa === va
      const maxApy = selectMaxAPY(validator, epochsPerYear)
      const active = selectSamActiveStake(validator)
      const target = selectSamTargetStake(validator)
      const delta = target - active
      const isNonProd = !isGhost && selectIsNonProductive(validator)

      const realIdx = displayValidators
        .slice(0, index + 1)
        .filter(d => !d.isGhost).length

      const rank = isGhost ? (getOriginalPosition(va) ?? realIdx) : realIdx

      const cardClass = [
        styles.card,
        isGhost ? styles.ghostCard : '',
        isNonProd ? styles.cardYellow : '',
      ]
        .filter(Boolean)
        .join(' ')

      return (
        <div
          key={`${va}-${isGhost ? 'ghost' : 'real'}`}
          className={cardClass}
          onClick={isGhost ? undefined : () => onValidatorClick(va)}
        >
          <div className={styles.compactRow}>
            <span className={styles.cardRank}>{rank}</span>
            <span
              className={styles.cardName}
              onClick={e => handleCopy(e, va)}
              title={isCopied ? 'Copied!' : 'Click to copy pubkey'}
            >
              {flag && <span className={styles.countryFlag}>{flag}</span>}
              <span>
                {displayName.length > 24
                  ? displayName.slice(0, 24) + '\u2026'
                  : displayName}
              </span>
              {isCopied && <span className={styles.copiedBadge}>Copied</span>}
            </span>
            <span className={styles.cardApy}>
              {formatPercentage(maxApy, 2, 0.5)}
            </span>
            <span className={styles.cardBond}>
              <span
                className={`${styles.bondDot} ${bondDotClassName(validator.bondState)}`}
              />
              {bondLabel(validator.bondState)}
            </span>
            <span
              className={`${styles.cardDelta} ${delta > 0 ? styles.deltaPos : delta < 0 ? styles.deltaNeg : ''}`}
            >
              {delta > 0 ? '\u25b2' : delta < 0 ? '\u25bc' : '\u2014'}
              {delta !== 0 && ` \u2609${formatSolAmount(Math.abs(delta), 0)}`}
            </span>
          </div>

          {density === 'expanded' && !isGhost && (
            <>
              <div className={styles.expandedContent}>
                <div className={styles.expandedLeft}>
                  <div className={styles.expandedLabel}>APY breakdown</div>
                  <div>Max APY: {formatPercentage(maxApy, 2, 0.5)}</div>
                  <div>
                    Eff. Bid: \u2609
                    {formatSolAmount(selectEffectiveBid(validator), 4)}
                  </div>
                  <div>
                    Bond bid: \u2609
                    {formatSolAmount(selectBondBid(validator) ?? 0, 4)}
                  </div>
                </div>
                <div className={styles.expandedCenter}>
                  <div className={styles.expandedLabel}>Bond health</div>
                  <div className={styles.bondHealth}>
                    <span
                      className={`${styles.bondDot} ${bondDotClassName(validator.bondState)}`}
                    />
                    <span>{bondLabel(validator.bondState)}</span>
                  </div>
                  <div
                    className={styles.bondBar}
                    {...tooltipAttributes(bondTooltip(validator.bondState))}
                  >
                    <div
                      className={styles.bondBarFill}
                      style={{
                        width: `${Math.min(100, (validator.bondGoodForNEpochs / 12) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className={styles.bondEpochs}>
                    {Math.round(validator.bondGoodForNEpochs)} epochs
                  </div>
                </div>
                <div className={styles.expandedRight}>
                  <div className={styles.expandedLabel}>Stake movement</div>
                  <div>Active: \u2609{formatSolAmount(active, 0)}</div>
                  <div>Target: \u2609{formatSolAmount(target, 0)}</div>
                  <div
                    className={
                      delta > 0
                        ? styles.deltaPos
                        : delta < 0
                          ? styles.deltaNeg
                          : ''
                    }
                  >
                    {delta > 0 ? '\u25b2' : delta < 0 ? '\u25bc' : '\u2014'}
                    {delta !== 0 &&
                      ` \u2609${formatSolAmount(Math.abs(delta), 0)}`}
                  </div>
                </div>
              </div>
              <div className={styles.tipLine}>
                {selectConstraintText(validator)}
              </div>
            </>
          )}
        </div>
      )
    })

    return (
      <div className={styles.cardList}>
        {simulationCaption}
        <div className={styles.densityToggle}>
          <button
            className={
              density === 'compact' ? styles.densityActive : styles.densityBtn
            }
            onClick={() => setDensity('compact')}
          >
            Compact
          </button>
          <span className={styles.densitySep}>|</span>
          <button
            className={
              density === 'expanded' ? styles.densityActive : styles.densityBtn
            }
            onClick={() => setDensity('expanded')}
          >
            Expanded
          </button>
        </div>
        {cards}
      </div>
    )
  }

  const renderExpertTable = () => (
    <Table
      caption={simulationCaption}
      data={displayValidators}
      rowAttrsFn={(item, index) => {
        const { validator, isGhost } = item
        const va = selectVoteAccount(validator)
        if (isGhost) {
          return { className: styles.ghostRow }
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
            styles.validatorRowClickable,
            getPositionChangeClass(va, realIdx) || styles.positionUnchanged,
          )
          onClick = () => onValidatorClick(va)
        } else if (simulationModeActive && !isEditing) {
          classes.push(styles.validatorRowClickable)
          onClick = () => onValidatorClick(va)
        } else if (isEditing) {
          classes.push(styles.validatorRowEditing)
        }

        if (selectIsNonProductive(validator)) {
          classes.push(styles.rowYellow)
        }

        return { className: classes.join(' ') || undefined, onClick }
      }}
      showRowNumber
      rowNumberRender={(item, index) => {
        const { validator, isGhost } = item
        const va = selectVoteAccount(validator)
        if (isGhost) {
          return (
            <div className={styles.orderCell}>
              <span>{getOriginalPosition(va) ?? index + 1}</span>
            </div>
          )
        }
        const realIdx = displayValidators
          .slice(0, index + 1)
          .filter(d => !d.isGhost).length
        const isEditing = editingValidator === va
        return (
          <div className={styles.orderCell}>
            <span>{realIdx}</span>
            {isEditing && (
              <div className={styles.editingButtons}>
                <button
                  className={`${styles.runSimulationBtn} ${isCalculating ? styles.runSimulationBtnCalculating : ''}`}
                  onClick={e => {
                    e.stopPropagation()
                    onRunSimulation()
                  }}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Simulating' : 'Simulate'}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={e => {
                    e.stopPropagation()
                    onCancelEditing()
                  }}
                  disabled={isCalculating}
                  title="Cancel editing (Esc)"
                >
                  \u2715
                </button>
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
              <span
                className={`${styles.pubkey} ${sim ? styles.pubkeySimulated : ''}`}
              >
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
          header: 'Bond [\u2609]',
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
          header: 'Stake \u0394 [\u2609]',
          headerAttrsFn: () =>
            tooltipAttributes(
              'Change from active to target stake (target \u2212 active). Sorts by target stake.',
            ),
          cellAttrsFn: item =>
            tooltipAttributes(
              `Active: \u2609${formatSolAmount(selectSamActiveStake(item.validator), 0)}<br/>` +
                `Target: \u2609${formatSolAmount(selectSamTargetStake(item.validator), 0)}`,
            ),
          render: item => {
            const delta =
              selectSamTargetStake(item.validator) -
              selectSamActiveStake(item.validator)
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
          header: 'Eff. Bid [\u2609]',
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
            return (
              <>
                {selectConstraintText(item.validator)
                  .replace('Stake capped by ', '')
                  .replace(' constraint', '')}
              </>
            )
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
      className={`${styles.tableWrap} ${simulationModeActive ? styles.simulationModeActive : ''} ${isCalculating ? styles.calculating : ''}`}
    >
      <div className={styles.metricWrap}>
        <div className={styles.metricRow}>
          <Metric
            label="Total Auction Stake"
            value={`\u2609 ${formatSolAmount(samDistributedStake)}`}
            {...tooltipAttributes(
              'How much stake is distributed by Marinade to validators based on SAM',
            )}
          />
          <Metric
            label="Winning APY"
            value={`\u2609 ${formatPercentage(winningAPY)}`}
            {...tooltipAttributes(
              'Estimated APY of the last validator winning the auction based on ideal count of epochs in the year; assumes no Marinade fees',
            )}
          />
          {apyMetrics}
          <ComplexMetric
            label="Winning Validators"
            value={
              <div>
                <span>{samStakeValidators.length}</span> /{' '}
                <span>{allValidators.length}</span>
              </div>
            }
            {...tooltipAttributes(
              'Number of validators that won stake in this SAM auction',
            )}
          />
        </div>
        {expertMetrics}
      </div>

      {level === UserLevel.Expert ? renderExpertTable() : renderCardList()}
    </div>
  )
}

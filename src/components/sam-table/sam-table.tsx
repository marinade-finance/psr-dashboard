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
  selectIdealAPY,
  selectStakeToMove,
  selectTotalActiveStake,
  selectSamActiveStake,
  bondHealthColor,
  bondTooltip,
  selectBondHealth,
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

type ValidatorWithBondState = AuctionValidator & {
  bondState: Color | undefined
}
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
  onValidatorClick: (voteAccount: string) => void
  onFieldChange: (field: EditField, value: string) => void
  onRunSimulation: () => void
  onCancelEditing: () => void
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
  const idealApy = selectIdealAPY(auctionResult, epochsPerYear)
  const stakeToMove = selectStakeToMove(auctionResult) / samDistributedStake
  const activeStake =
    selectTotalActiveStake(auctionResult) / samDistributedStake
  const productiveStake =
    selectProductiveStake(auctionResult) / samDistributedStake
  const targetProtectedPct = selectTargetProtectedPct(auctionResult)
  const unprotectedStake = selectActuallyUnprotectedStake(auctionResult)

  const tableWrapRef = useRef<HTMLDivElement>(null)

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
        bondState: bondHealthColor(v, dsSamConfig.minBondEpochs),
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

  const defaultOrder: Order[] = useMemo(() => [[9, OrderDirection.DESC]], [])

  const [currentOrder, setCurrentOrder] = useState<Order[]>(defaultOrder)

  const handleOrderChange = useCallback((order: Order[]) => {
    setCurrentOrder(order)
  }, [])

  // Must match Table columns order
  const compareByColumn = useCallback(
    (a: AuctionValidator, b: AuctionValidator, columnIndex: number): number => {
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
            selectBondHealth(a, dsSamConfig.minBondEpochs) -
            selectBondHealth(b, dsSamConfig.minBondEpochs)
          )
        case 7:
          return selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        case 8:
          return selectSamActiveStake(a) - selectSamActiveStake(b)
        case 9:
          return selectSamTargetStake(a) - selectSamTargetStake(b)
        case 10:
          return selectEffectiveBid(a) - selectEffectiveBid(b)
        default:
          return 0
      }
    },
    [epochsPerYear],
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
        const originalValidator = {
          ...orig,
          bondState: bondHealthColor(orig, dsSamConfig.minBondEpochs),
        }
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
        value={`☉ ${formatPercentage(idealApy)}`}
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

  return (
    <div
      ref={tableWrapRef}
      className={`${styles.tableWrap} ${simulationModeActive ? styles.simulationModeActive : ''} ${isCalculating ? styles.calculating : ''}`}
    >
      <div className={styles.metricWrap}>
        <div className={styles.metricRow}>
          <Metric
            label="Total Auction Stake"
            value={`☉ ${formatSolAmount(samDistributedStake)}`}
            {...tooltipAttributes(
              'How much stake is distributed by Marinade to validators based on SAM',
            )}
          />
          <Metric
            label="Winning APY"
            value={`☉ ${formatPercentage(winningAPY)}`}
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

      <Table
        caption={
          simulationModeActive ? (
            <div className={styles.simulationBanner}>
              {isCalculating
                ? 'Calculating simulation...'
                : 'Simulation mode active'}
            </div>
          ) : undefined
        }
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
                    ✕
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
            header: 'Bond [☉]',
            headerAttrsFn: () => tooltipAttributes('Bond Balance.'),
            cellAttrsFn: item =>
              tooltipAttributes(bondTooltip(item.validator.bondState)),
            render: item => (
              <>{formatSolAmount(selectBondSize(item.validator), 0)}</>
            ),
            compare: (a, b) =>
              selectBondSize(a.validator) - selectBondSize(b.validator),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'B. For',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Epochs of bond runway above the minimum required — hits 0 when undelegation begins.',
              ),
            cellAttrsFn: item =>
              tooltipAttributes(bondTooltip(item.validator.bondState)),
            render: item => {
              const h = Math.round(
                selectBondHealth(item.validator, dsSamConfig.minBondEpochs),
              )
              return <>{h > 100 ? '>100' : h}</>
            },
            compare: (a, b) =>
              selectBondHealth(a.validator, dsSamConfig.minBondEpochs) -
              selectBondHealth(b.validator, dsSamConfig.minBondEpochs),
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
            header: 'SAM Active [☉]',
            headerAttrsFn: () =>
              tooltipAttributes('The currently active stake delegated by SAM.'),
            render: item => (
              <>{formatSolAmount(selectSamActiveStake(item.validator), 0)}</>
            ),
            compare: (a, b) =>
              selectSamActiveStake(a.validator) -
              selectSamActiveStake(b.validator),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'SAM Target [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'The target stake to be received based off the auction.',
              ),
            cellAttrsFn: item =>
              tooltipAttributes(selectConstraintText(item.validator)),
            render: item => (
              <>{formatSolAmount(selectSamTargetStake(item.validator), 0)}</>
            ),
            compare: (a, b) =>
              selectSamTargetStake(a.validator) -
              selectSamTargetStake(b.validator),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Eff. Bid [☉]',
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
        ]}
        defaultOrder={defaultOrder}
        onOrderChange={handleOrderChange}
        presorted
      />
    </div>
  )
}

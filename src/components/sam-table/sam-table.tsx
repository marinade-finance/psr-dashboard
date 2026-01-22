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
  bondColorState,
  bondTooltip,
  selectProductiveStake,
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
import { Alignment, OrderDirection, Table } from '../table/table'

import type { Order } from '../table/table'
import type { Color } from '../table/table'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'

// Validator with computed bond state
type ValidatorWithBondState = AuctionValidator & { bondState: Color }

// Display item - either a real validator or a ghost (original before simulation)
type DisplayValidator = {
  validator: ValidatorWithBondState
  isGhost: boolean
}

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  simulationModeActive: boolean
  onToggleSimulationMode: () => void
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

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult,
  epochsPerYear,
  dsSamConfig,
  level,
  simulationModeActive,
  onToggleSimulationMode,
  editingValidator,
  simulatedValidator,
  isCalculating,
  hasSimulationApplied,
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
  const bondObligationSafetyMult = dsSamConfig.bondObligationSafetyMult
  const stakeToMove = selectStakeToMove(auctionResult) / samDistributedStake
  const activeStake =
    selectTotalActiveStake(auctionResult) / samDistributedStake
  const productiveStake =
    selectProductiveStake(auctionResult) / samDistributedStake

  // Ref for click-outside detection
  const tableWrapRef = useRef<HTMLDivElement>(null)

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

  // Current validators with bond state
  const validatorsWithBond: ValidatorWithBondState[] = useMemo(
    () =>
      validators
        .filter(validator => selectBondSize(validator) > 0)
        .map(v => ({
          ...v,
          bondState: bondColorState(v, bondObligationSafetyMult),
        })),
    [validators, bondObligationSafetyMult],
  )

  // Original validators with bond state (for ghost rows)
  const originalValidatorsWithBond: ValidatorWithBondState[] = useMemo(() => {
    if (!originalAuctionResult) return []
    return originalAuctionResult.auctionData.validators
      .filter(v => selectBondSize(v) > 0)
      .map(v => ({
        ...v,
        bondState: bondColorState(v, bondObligationSafetyMult),
      }))
  }, [originalAuctionResult, bondObligationSafetyMult])

  // Check if simulated data actually changed from original
  const hasDataChanged = useMemo(() => {
    if (!simulatedValidator || !originalAuctionResult) return false
    const original = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === simulatedValidator,
    )
    const simulated = validators.find(v => v.voteAccount === simulatedValidator)
    if (!original || !simulated) return false

    // Compare relevant fields
    return (
      original.inflationCommissionDec !== simulated.inflationCommissionDec ||
      original.mevCommissionDec !== simulated.mevCommissionDec ||
      original.blockRewardsCommissionDec !==
        simulated.blockRewardsCommissionDec ||
      original.revShare.bidPmpe !== simulated.revShare.bidPmpe
    )
  }, [simulatedValidator, originalAuctionResult, validators])

  const samStakeValidators = validatorsWithBond.filter(
    v => v.auctionStake.marinadeSamTargetSol,
  )
  const avgStake =
    samStakeValidators.reduce(
      (agg, v) => agg + v.auctionStake.marinadeSamTargetSol,
      0,
    ) / samStakeValidators.length

  // Helper to get input value - either from pending edits or original data
  const getInputValue = (
    field:
      | 'inflationCommission'
      | 'mevCommission'
      | 'blockRewardsCommission'
      | 'bidPmpe',
    originalValue: string,
  ): string => {
    if (pendingEdits[field] !== undefined) {
      return pendingEdits[field]
    }
    return originalValue
  }

  // Default table sort order
  const defaultOrder: Order[] = useMemo(
    () => [
      [7, OrderDirection.DESC],
      [5, OrderDirection.DESC],
    ],
    [],
  )

  // Track current table sort order
  const [currentOrder, setCurrentOrder] = useState<Order[]>(defaultOrder)

  // Handle order change from Table
  const handleOrderChange = useCallback((order: Order[]) => {
    setCurrentOrder(order)
  }, [])

  // Comparator for sorting validators by column index (must match Table columns order)
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
    [epochsPerYear],
  )

  // Compute original positions map using the current table sort order
  const originalPositionsMap = useMemo(() => {
    if (!originalAuctionResult) return null

    const originalValidators =
      originalAuctionResult.auctionData.validators.filter(
        v => selectBondSize(v) > 0,
      )

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

  // Helper to find the original position of a validator (using sorted positions)
  const getOriginalPosition = (voteAccount: string): number | null => {
    if (!originalPositionsMap) return null
    return originalPositionsMap.get(voteAccount) ?? null
  }

  // Helper to determine position change color
  const getPositionChangeClass = (
    voteAccount: string,
    currentPosition: number,
  ): string | null => {
    const originalPosition = getOriginalPosition(voteAccount)
    if (originalPosition === null || originalPosition === -1) return null

    if (currentPosition < originalPosition) {
      // Lower position number = better (moved up in the list)
      return styles.positionImproved
    } else if (currentPosition > originalPosition) {
      // Higher position number = worse (moved down in the list)
      return styles.positionWorsened
    } else {
      // Same position
      return styles.positionUnchanged
    }
  }

  // Sort validators using current order (same as Table does)
  const sortedValidatorsWithBond = useMemo(() => {
    return [...validatorsWithBond].sort((a, b) => {
      for (const [columnIndex, orderDirection] of currentOrder) {
        const result = compareByColumn(a, b, columnIndex)
        if (result !== 0) {
          return orderDirection === OrderDirection.ASC ? result : -result
        }
      }
      return 0
    })
  }, [validatorsWithBond, currentOrder, compareByColumn])

  // Build display list with ghost row for simulated validator
  const displayValidators: DisplayValidator[] = useMemo(() => {
    // Wrap sorted validators
    const display: DisplayValidator[] = sortedValidatorsWithBond.map(v => ({
      validator: v,
      isGhost: false,
    }))

    // If there's a simulated validator with changed data, insert ghost at original position
    if (
      simulatedValidator &&
      hasDataChanged &&
      originalValidatorsWithBond.length > 0
    ) {
      // Find the original validator data
      const originalValidator = originalValidatorsWithBond.find(
        v => v.voteAccount === simulatedValidator,
      )
      if (originalValidator) {
        const originalPosition = getOriginalPosition(simulatedValidator)
        // Find the current position of the simulated validator in sorted list
        const currentSimulatedIndex = display.findIndex(
          d => d.validator.voteAccount === simulatedValidator,
        )
        if (originalPosition !== null && originalPosition > 0) {
          // Calculate where to insert ghost based on original position
          // If simulated moved up (lower number), ghost goes at higher index
          // If simulated moved down (higher number), ghost goes at lower index but after simulated
          let insertIndex: number
          const adjustedOriginalPos = originalPosition - 1 // Convert to 0-based

          if (currentSimulatedIndex < adjustedOriginalPos) {
            // Simulated moved UP - ghost should be at original position (below simulated)
            // Account for the fact that simulated is no longer at original position
            insertIndex = adjustedOriginalPos
          } else if (currentSimulatedIndex > adjustedOriginalPos) {
            // Simulated moved DOWN - ghost at original position, simulated is below
            insertIndex = adjustedOriginalPos
          } else {
            // Same position - show ghost right after simulated
            insertIndex = currentSimulatedIndex + 1
          }

          insertIndex = Math.min(insertIndex, display.length)
          display.splice(insertIndex, 0, {
            validator: originalValidator,
            isGhost: true,
          })
        }
      }
    }

    return display
  }, [
    sortedValidatorsWithBond,
    simulatedValidator,
    hasDataChanged,
    originalValidatorsWithBond,
    getOriginalPosition,
  ])

  let expertMetrics
  let apyMetrics
  if (level === UserLevel.Expert) {
    expertMetrics = (
      <>
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
            'Share of stake that pays at least 90% of winning bid',
          )}
        />
        <Metric
          label="Avg. Stake"
          value={`${formatSolAmount(avgStake, 0)}`}
          {...tooltipAttributes('Average stake per validator')}
        />
      </>
    )
    apyMetrics = (
      <>
        <Metric
          label="Ideal APY"
          value={`☉ ${formatPercentage(projectedApy / activeStake)}`}
          {...tooltipAttributes(
            'Estimated APY of currently active stake; assumes no Marinade fees; assumes all distributed stake is active',
          )}
        />
      </>
    )
  } else {
    if (activeStake > 0.9) {
      apyMetrics = (
        <>
          <Metric
            label="Projected APY"
            value={`☉ ${formatPercentage(projectedApy)}`}
            {...tooltipAttributes(
              'Estimated APY of currently active stake; assumes no Marinade fees',
            )}
          />
        </>
      )
    }
  }

  return (
    <div
      ref={tableWrapRef}
      className={`${styles.tableWrap} ${simulationModeActive ? styles.simulationModeActive : ''} ${isCalculating ? styles.calculating : ''}`}
    >
      <div className={styles.metricWrap}>
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
        <>{apyMetrics}</>
        <ComplexMetric
          label="Winning Validators"
          value={
            <div>
              <span>{samStakeValidators.length}</span> /{' '}
              <span>{validatorsWithBond.length}</span>
            </div>
          }
          {...tooltipAttributes(
            'Number of validators that won stake in this SAM auction',
          )}
        />
        <>{expertMetrics}</>
        <div className={styles.simulatorToggleWrap}>
          <button
            className={`${styles.simulatorToggle} ${simulationModeActive ? styles.simulatorToggleActive : ''}`}
            onClick={onToggleSimulationMode}
            disabled={isCalculating}
          >
            {simulationModeActive ? 'Exit Simulation' : 'Enter Simulation'}
          </button>
          {hasSimulationApplied && !isCalculating && (
            <span className={styles.simulationNote}>Simulation applied</span>
          )}
          {isCalculating && (
            <span className={styles.simulationNote}>Calculating...</span>
          )}
        </div>
      </div>

      <Table
        data={displayValidators}
        rowAttrsFn={(item, index) => {
          const { validator, isGhost } = item
          const voteAccount = selectVoteAccount(validator)
          const isEditing = !isGhost && editingValidator === voteAccount
          const isSimulated = !isGhost && simulatedValidator === voteAccount
          const canClick = simulationModeActive && !isEditing && !isGhost

          const attrs: {
            className?: string
            onClick?: React.MouseEventHandler<HTMLTableRowElement>
          } = {}

          // Ghost rows have special styling and are not clickable
          if (isGhost) {
            attrs.className = styles.ghostRow
            return attrs
          }

          // Add position change styling if this validator was simulated (and not being edited)
          // This should be applied first, then other styles can be added
          if (isSimulated && !isEditing) {
            // Count only non-ghost rows for position
            const realIndex = displayValidators
              .slice(0, index + 1)
              .filter(d => !d.isGhost).length
            const positionClass = getPositionChangeClass(voteAccount, realIndex)
            // Always apply position styling for simulated validator
            attrs.className = `${styles.validatorRowClickable} ${positionClass || styles.positionUnchanged}`
            attrs.onClick = () => onValidatorClick(voteAccount)
            return attrs
          }

          // Add clickable styling if in simulation mode and not currently editing this row
          if (canClick) {
            attrs.className = styles.validatorRowClickable
            attrs.onClick = () => onValidatorClick(voteAccount)
          } else if (isEditing) {
            attrs.className = styles.validatorRowEditing
          }

          return attrs
        }}
        showRowNumber
        rowNumberRender={(item, index) => {
          const { validator, isGhost } = item
          const voteAccount = selectVoteAccount(validator)
          const isEditing = !isGhost && editingValidator === voteAccount

          // For ghost rows, show the original position
          if (isGhost) {
            const originalPosition = getOriginalPosition(voteAccount)
            return (
              <div className={styles.orderCell}>
                <span>{originalPosition ?? index + 1}</span>
              </div>
            )
          }

          // Count only non-ghost rows for position
          const realIndex = displayValidators
            .slice(0, index + 1)
            .filter(d => !d.isGhost).length

          return (
            <div className={styles.orderCell}>
              <span>{realIndex}</span>
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
              const { validator, isGhost } = item
              const voteAccount = selectVoteAccount(validator)
              const isSimulated = !isGhost && simulatedValidator === voteAccount

              return (
                <span
                  className={`${styles.pubkey} ${isSimulated ? styles.pubkeySimulated : ''}`}
                >
                  {voteAccount}
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
              const voteAccount = selectVoteAccount(validator)
              const isEditing = !isGhost && editingValidator === voteAccount
              const originalValue = selectCommission(validator) * 100
              const displayValue = formatPercentage(
                selectCommission(validator),
                0,
              )
              if (isEditing) {
                const inputValue = getInputValue(
                  'inflationCommission',
                  originalValue.toString(),
                )
                return (
                  <div className={styles.inputCell}>
                    <span className={styles.inputPlaceholder}>
                      {displayValue}
                    </span>
                    <input
                      type="number"
                      className={styles.inlineInput}
                      value={inputValue}
                      step="0.1"
                      min="0"
                      max="100"
                      onChange={e =>
                        onFieldChange('inflationCommission', e.target.value)
                      }
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
              return <>{displayValue}</>
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
              const voteAccount = selectVoteAccount(validator)
              const isEditing = !isGhost && editingValidator === voteAccount
              const mevCommission = selectMevCommission(validator)
              const originalValue =
                mevCommission !== null ? mevCommission * 100 : null
              const displayValue = formattedMevCommission(validator)
              if (isEditing) {
                const inputValue = getInputValue(
                  'mevCommission',
                  originalValue?.toString() ?? '',
                )
                return (
                  <div className={styles.inputCell}>
                    <span className={styles.inputPlaceholder}>
                      {displayValue}
                    </span>
                    <input
                      type="number"
                      className={styles.inlineInput}
                      value={inputValue}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="-"
                      onChange={e =>
                        onFieldChange('mevCommission', e.target.value)
                      }
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
              return <>{displayValue}</>
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
              const voteAccount = selectVoteAccount(validator)
              const isEditing = !isGhost && editingValidator === voteAccount
              const blockCommission = selectBlockRewardsCommission(validator)
              const originalValue =
                blockCommission !== null ? blockCommission * 100 : null
              const displayValue = formattedBlockRewardsCommission(validator)
              if (isEditing) {
                const inputValue = getInputValue(
                  'blockRewardsCommission',
                  originalValue?.toString() ?? '',
                )
                return (
                  <div className={styles.inputCell}>
                    <span className={styles.inputPlaceholder}>
                      {displayValue}
                    </span>
                    <input
                      type="number"
                      className={styles.inlineInput}
                      value={inputValue}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="-"
                      onChange={e =>
                        onFieldChange('blockRewardsCommission', e.target.value)
                      }
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
              return <>{displayValue}</>
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
              const voteAccount = selectVoteAccount(validator)
              const isEditing = !isGhost && editingValidator === voteAccount
              const originalValue = selectBid(validator)
              const displayValue = formatSolAmount(selectBid(validator), 4)
              if (isEditing) {
                const inputValue = getInputValue(
                  'bidPmpe',
                  originalValue.toString(),
                )
                return (
                  <div className={styles.inputCell}>
                    <span className={styles.inputPlaceholder}>
                      {displayValue}
                    </span>
                    <input
                      type="number"
                      className={styles.inlineInput}
                      value={inputValue}
                      step="0.001"
                      min="0"
                      onChange={e => onFieldChange('bidPmpe', e.target.value)}
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
              return <>{displayValue}</>
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

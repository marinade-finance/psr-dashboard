import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatPercentage, formatSolAmount } from 'src/format'
import {
  selectBid,
  selectBondSize,
  selectCommission,
  selectEffectiveBid,
  selectEffectiveCost,
  selectConstraintText,
  selectMaxAPY,
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
  formattedMevCommission,
  formattedBlockRewardsCommission,
  selectMevCommissionPmpe,
  selectCommissionPmpe,
  selectBlockRewardsCommissionPmpe,
  overridesCpmpeMessage as overridesBidCpmpeMessage,
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
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'

type ValidatorWithBondState = AuctionValidator & { bondState?: Color }
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
  const projectedApy = selectProjectedAPY(auctionResult, epochsPerYear)
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

  const defaultOrder: Order[] = useMemo(() => [[6, OrderDirection.DESC]], [])

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
          return selectBid(a) - selectBid(b)
        case 2:
          return selectBondSize(a) - selectBondSize(b)
        case 3:
          return selectBondHealth(a) - selectBondHealth(b)
        case 4:
          return selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        case 5:
          return selectSamActiveStake(a) - selectSamActiveStake(b)
        case 6:
          return selectSamTargetStake(a) - selectSamTargetStake(b)
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
          bondState: bondHealthColor(orig),
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
            header: 'St. Bid',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Static bid for 1000 SOL set by the validator in Bond configuration.<br/>' +
                  'The bid active at the slot the auction runs is what you pay for that epoch’s activating stake.',
              ),
            cellAttrsFn: item => {
              const effBid = selectEffectiveBid(item.validator)
              const bid = selectBid(item.validator)
              const stake = item.validator.marinadeActivatedStakeSol
              const target = item.validator.auctionStake.marinadeSamTargetSol
              const activating = Math.max(0, target - stake)
              const cost = selectEffectiveCost(item.validator)
              const activatingCost = (bid * activating) / 1000
              const num =
                'font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;'
              const row = (
                label: string,
                qty: string,
                rate: string,
                value: string,
              ) =>
                '<tr>' +
                `<td style="padding:2px 12px 2px 0;white-space:nowrap;">${label}</td>` +
                `<td style="padding:2px 10px 2px 0;text-align:right;white-space:nowrap;opacity:0.85;${num}">${qty}</td>` +
                `<td style="padding:2px 10px 2px 0;text-align:right;white-space:nowrap;opacity:0.85;${num}">${rate}</td>` +
                `<td style="padding:2px 0;text-align:right;white-space:nowrap;${num}"><b>${value}</b></td>` +
                '</tr>'
              const rule = (label: string) =>
                `<tr><td colspan="4" style="border-top:1px dashed rgba(255,255,255,0.45);padding-top:4px;font-size:0.8em;opacity:0.85;letter-spacing:0.06em;text-transform:uppercase;">${label}</td></tr>`
              const header = overridesBidCpmpeMessage(item.validator)
              const headerHtml = header
                ? `<div style="margin-bottom:6px;">${header.replace(/<br\/?>/g, '')}</div>`
                : ''
              const total = cost + activatingCost
              const inflPct = formatPercentage(
                selectCommission(item.validator),
                0,
              )
              const mevPct = formattedMevCommission(item.validator)
              const blkPct = formattedBlockRewardsCommission(item.validator)
              return tooltipAttributes(
                headerHtml +
                  '<table style="width:100%;border-collapse:collapse;font-size:0.9em;">' +
                  rule('Commissions') +
                  row(
                    'Inflation',
                    inflPct,
                    `${selectCommissionPmpe(item.validator)}`,
                    `${selectCommissionPmpe(item.validator)} ☉`,
                  ) +
                  row(
                    'MEV',
                    mevPct,
                    `${selectMevCommissionPmpe(item.validator)}`,
                    `${selectMevCommissionPmpe(item.validator)} ☉`,
                  ) +
                  row(
                    'Block',
                    blkPct,
                    `${selectBlockRewardsCommissionPmpe(item.validator)}`,
                    `${selectBlockRewardsCommissionPmpe(item.validator)} ☉`,
                  ) +
                  rule(
                    `Charge this epoch · eff. bid ${formatSolAmount(effBid, 4)} ☉ / 1000`,
                  ) +
                  row(
                    'Activated',
                    `${formatSolAmount(stake, 0)} ☉`,
                    `× ${formatSolAmount(effBid, 4)}`,
                    `${formatSolAmount(cost, 3)} ☉`,
                  ) +
                  row(
                    'Activating',
                    `~${formatSolAmount(activating, 0)} ☉`,
                    `× ${formatSolAmount(bid, 4)}`,
                    `${formatSolAmount(activatingCost, 3)} ☉`,
                  ) +
                  '<tr><td colspan="3" style="border-top:1px solid rgba(255,255,255,0.7);padding:4px 10px 2px 0;text-align:right;">Total</td>' +
                  `<td style="border-top:1px solid rgba(255,255,255,0.7);padding:4px 0 2px;text-align:right;${num}"><b>${formatSolAmount(total, 3)} ☉</b></td></tr>` +
                  '</table>',
              )
            },
            render: item => {
              const { validator, isGhost } = item
              const isEditing =
                !isGhost && editingValidator === selectVoteAccount(validator)
              if (isEditing) {
                return renderEditableCell(
                  true,
                  formatSolAmount(selectBid(validator), 4),
                  'bidPmpe',
                  inputVal('bidPmpe', selectBid(validator).toString()),
                  onFieldChange,
                  onRunSimulation,
                  onCancelEditing,
                  { step: '0.001', min: '0' },
                )
              }
              const mev = formattedMevCommission(validator)
              const blk = formattedBlockRewardsCommission(validator)
              return (
                <>
                  <div>{formatSolAmount(selectBid(validator), 4)}</div>
                  <div
                    style={{
                      fontSize: '0.75em',
                      opacity: 0.55,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {`i ${formatPercentage(selectCommission(validator), 0)} · m ${mev} · b ${blk}`}
                  </div>
                </>
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
            header: 'Cover. [ep]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Epochs of bond runway above the minimum required reserve. At 0, SAM starts capping stake. Negative means the bond is short of the reserve by that many epochs of max-bid payments — top up to avoid further stake cuts.',
              ),
            cellAttrsFn: item =>
              tooltipAttributes(bondTooltip(item.validator.bondState)),
            render: item => {
              if (!item.validator.auctionStake.marinadeSamTargetSol) {
                return <>-</>
              }
              const h = Math.floor(selectBondHealth(item.validator))
              return <>{h > 100 ? '>100' : h}</>
            },
            compare: (a, b) =>
              selectBondHealth(a.validator) - selectBondHealth(b.validator),
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
        ]}
        defaultOrder={defaultOrder}
        onOrderChange={handleOrderChange}
        presorted
      />
    </div>
  )
}

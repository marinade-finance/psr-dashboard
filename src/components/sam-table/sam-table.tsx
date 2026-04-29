import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatPercentage, formatSolAmount } from 'src/format'
import {
  selectBid,
  selectBondSize,
  selectConstraintText,
  selectMaxAPY,
  selectSamDistributedStake,
  selectSamTargetStake,
  selectVoteAccount,
  selectWinningAPY,
  selectProjectedAPY,
  selectIdealAPY,
  selectStakeToMove,
  selectRedelegationBudget,
  augmentAuctionResult,
  selectTotalActiveStake,
  selectSamActiveStake,
  bondHealthColor,
  selectBondHealth,
  selectProductiveStake,
  selectIsNonProductive,
  selectTargetProtectedPct,
  selectActuallyUnprotectedStake,
  buildConcentrationBreakdown,
} from 'src/services/sam'

import styles from './sam-table.module.css'
import { tooltipAttributes } from '../../services/utils'
import { buildBondBreakdownTooltip } from '../../tooltips/bond-breakdown'
import { buildSamActiveTooltip } from '../../tooltips/sam-active'
import { ConcentrationMetric } from '../concentration-metric/concentration-metric'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import { SimForm } from '../sim-form/sim-form'
import { StakeChangeIndicator } from '../stake-change-indicator/stake-change-indicator'
import { Alignment, Color, OrderDirection, Table } from '../table/table'

import type { Order } from '../table/table'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { PendingEdits } from 'src/pages/sam'
import type { AugmentedAuctionValidator } from 'src/services/sam'

type ValidatorWithBondState = AugmentedAuctionValidator & { bondState?: Color }

type PenaltyKind = 'bidLow' | 'blacklist' | 'risk'

const penaltyClass: Record<PenaltyKind, string> = {
  bidLow: styles.penalty_bidLow,
  blacklist: styles.penalty_blacklist,
  risk: styles.penalty_risk,
}

const PenaltyIcon: Record<PenaltyKind, JSX.Element> = {
  bidLow: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
}

const renderPenaltyBadges = (v: AuctionValidator) => {
  const stakeSol = v.marinadeActivatedStakeSol
  const badges: { label: string; sol: number; kind: PenaltyKind }[] = []
  const bidTooLowSol = (stakeSol * v.revShare.bidTooLowPenaltyPmpe) / 1000
  const blacklistSol = (stakeSol * v.revShare.blacklistPenaltyPmpe) / 1000
  const bondRiskSol = v.values?.bondRiskFeeSol ?? 0
  if (bidTooLowSol > 0)
    badges.push({ label: 'BidTooLow', sol: bidTooLowSol, kind: 'bidLow' })
  if (blacklistSol > 0)
    badges.push({ label: 'Blacklist', sol: blacklistSol, kind: 'blacklist' })
  if (bondRiskSol > 0)
    badges.push({ label: 'BondRiskFee', sol: bondRiskSol, kind: 'risk' })
  if (badges.length === 0) return null

  const cls = (b: { kind: PenaltyKind }) =>
    `${styles.penaltyBadge} ${penaltyClass[b.kind]}`
  const fmt = (b: { label: string; sol: number }) =>
    `<b>${b.label}</b>: ${formatSolAmount(b.sol, 3)} SOL (estimate)`

  if (badges.length === 1) {
    const b = badges[0]
    return (
      <span className={styles.penalties} data-count="1">
        <span
          key={b.label}
          {...tooltipAttributes(fmt(b))}
          className={cls(b)}
          aria-label={b.label}
        >
          {PenaltyIcon[b.kind]}
        </span>
      </span>
    )
  }

  const joinedTooltip = badges.map(fmt).join('<br/>')
  return (
    <span
      className={styles.penalties}
      data-count={String(badges.length)}
      {...tooltipAttributes(joinedTooltip)}
      aria-label={badges.map(b => b.label).join(', ')}
    >
      {badges.map(b => (
        <span key={b.label} className={cls(b)} aria-hidden="true">
          {PenaltyIcon[b.kind]}
        </span>
      ))}
    </span>
  )
}

type DisplayValidator = { validator: ValidatorWithBondState; isGhost: boolean }
type EditField = keyof PendingEdits

const DEFAULT_ORDER: Order[] = [[6, OrderDirection.DESC]]

type Props = {
  auctionResult: AuctionResult
  nameByVote: Map<string, string>
  tvlJoinApyDiff: number
  tvlLeaveApyDiff: number
  backstopDiff: number
  backstopTvl: number
  dcSamConfig: DsSamConfig
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  minBondEpochs: number
  idealBondEpochs: number
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

export const SamTable: React.FC<Props> = ({
  auctionResult,
  nameByVote,
  tvlJoinApyDiff,
  tvlLeaveApyDiff,
  backstopDiff,
  backstopTvl,
  dcSamConfig,
  originalAuctionResult,
  epochsPerYear,
  minBondEpochs,
  idealBondEpochs,
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
  const validators = augmentAuctionResult(auctionResult)
  if (originalAuctionResult) augmentAuctionResult(originalAuctionResult)
  const samDistributedStake = Math.round(selectSamDistributedStake(validators))
  const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)
  const projectedApy = selectProjectedAPY(auctionResult, epochsPerYear)
  const idealApy = selectIdealAPY(auctionResult, epochsPerYear)
  const stakeToMoveSol = selectStakeToMove(auctionResult)
  const stakeToMove = stakeToMoveSol / samDistributedStake
  const redelegationBudget = selectRedelegationBudget(auctionResult)
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

  const allValidators: ValidatorWithBondState[] = useMemo(
    () =>
      validators.map(v => ({
        ...v,
        bondState: bondHealthColor(v),
      })),
    [validators],
  )

  const samStakeValidators = allValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol,
  )
  const avgStake =
    samStakeValidators.reduce(
      (s, v) => s + v.auctionStake.marinadeSamTargetSol,
      0,
    ) / samStakeValidators.length

  const concentration = buildConcentrationBreakdown(auctionResult, dcSamConfig)

  const [currentOrder, setCurrentOrder] = useState<Order[]>(DEFAULT_ORDER)

  const handleOrderChange = useCallback((order: Order[]) => {
    setCurrentOrder(order)
  }, [])

  // Must match Table columns order
  const compareByColumn = useCallback(
    (a: AuctionValidator, b: AuctionValidator, columnIndex: number): number => {
      const nameOf = (va: string) => nameByVote.get(va) ?? ''
      switch (columnIndex) {
        case 0:
          return selectVoteAccount(a).localeCompare(selectVoteAccount(b))
        case 1:
          return nameOf(selectVoteAccount(a)).localeCompare(
            nameOf(selectVoteAccount(b)),
          )
        case 2:
          return selectBid(a) - selectBid(b)
        case 3:
          return selectBondSize(a) - selectBondSize(b)
        case 4:
          return selectBondHealth(a) - selectBondHealth(b)
        case 5:
          return selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear)
        case 6:
          return selectSamActiveStake(a) - selectSamActiveStake(b)
        case 7:
          return selectSamTargetStake(a) - selectSamTargetStake(b)
        default:
          return 0
      }
    },
    [epochsPerYear, nameByVote],
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

    const orig =
      simulatedValidator && originalAuctionResult
        ? (
            originalAuctionResult.auctionData
              .validators as AugmentedAuctionValidator[]
          ).find(v => v.voteAccount === simulatedValidator)
        : undefined
    const sim = simulatedValidator
      ? validators.find(v => v.voteAccount === simulatedValidator)
      : undefined
    const hasDataChanged =
      !!orig && !!sim && orig.revShare.bidPmpe !== sim.revShare.bidPmpe

    if (hasDataChanged && orig && simulatedValidator) {
      const originalPosition = getOriginalPosition(simulatedValidator)
      if (originalPosition !== null && originalPosition > 0) {
        const currentSimulatedIndex = display.findIndex(
          d => d.validator.voteAccount === simulatedValidator,
        )
        const adjustedOriginalPos = originalPosition - 1
        const insertIndex = Math.min(
          currentSimulatedIndex === adjustedOriginalPos
            ? currentSimulatedIndex + 1
            : adjustedOriginalPos,
          display.length,
        )
        display.splice(insertIndex, 0, {
          validator: { ...orig, bondState: bondHealthColor(orig) },
          isGhost: true,
        })
      }
    }

    return display
  }, [
    sortedValidators,
    simulatedValidator,
    originalAuctionResult,
    validators,
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
            label="Stake To Distribute"
            value={`☉ ${formatSolAmount(redelegationBudget, 0)}`}
            {...tooltipAttributes(
              'Stake that cooled down in the previous epoch and is available to re-delegate next epoch',
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
          <Metric
            label="Total Auction Stake"
            value={`☉ ${formatSolAmount(samDistributedStake, 0)}`}
            {...tooltipAttributes(
              'How much stake is distributed by Marinade to validators based on SAM',
            )}
          />
          <Metric
            label="Winning Validators"
            value={`${samStakeValidators.length} / ${allValidators.length}`}
            {...tooltipAttributes(
              'Number of validators that won stake in this SAM auction',
            )}
          />
          <ConcentrationMetric
            label="Top Countries"
            rows={concentration.countries}
            capPct={concentration.countryCapPct}
          />
          <ConcentrationMetric
            label="Top ASOs"
            rows={concentration.asos}
            capPct={concentration.asoCapPct}
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

          if (isSimulated) {
            const realIdx = displayValidators
              .slice(0, index + 1)
              .filter(d => !d.isGhost).length
            classes.push(
              getPositionChangeClass(va, realIdx) || styles.positionUnchanged,
            )
          }
          if (isEditing) {
            classes.push(styles.validatorRowEditing)
          } else if (simulationModeActive || isSimulated) {
            classes.push(styles.validatorRowClickable)
            onClick = () => onValidatorClick(va)
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
          return (
            <div className={styles.orderCell}>
              <span>{realIdx}</span>
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
              const isEditing = !item.isGhost && editingValidator === va
              const v = item.validator
              const defaults: Record<EditField, string> = {
                bidPmpe: selectBid(v).toString(),
                inflationCommissionPct: (
                  (v.values?.commissions?.inflationCommissionDec ??
                    v.inflationCommissionDec ??
                    0) * 100
                ).toString(),
                mevCommissionPct: (
                  (v.values?.commissions?.mevCommissionDec ??
                    v.mevCommissionDec ??
                    0) * 100
                ).toString(),
                blockRewardsCommissionPct: (
                  (v.values?.commissions?.blockRewardsCommissionDec ??
                    v.blockRewardsCommissionDec ??
                    0) * 100
                ).toString(),
                bondTopUpSol: '0',
              }
              return (
                <span className={styles.validatorCell}>
                  <span
                    className={`${styles.pubkey} ${sim ? styles.pubkeySimulated : ''}`}
                  >
                    {va}
                  </span>
                  {renderPenaltyBadges(item.validator)}
                  {isEditing && (
                    <span className={styles.popoverAnchor}>
                      <SimForm
                        voteAccount={va}
                        name={nameByVote.get(va) ?? ''}
                        defaults={defaults}
                        pendingEdits={pendingEdits}
                        isCalculating={isCalculating}
                        onFieldChange={onFieldChange}
                        onRunSimulation={onRunSimulation}
                        onCancelEditing={onCancelEditing}
                      />
                    </span>
                  )}
                </span>
              )
            },
            compare: (a, b) =>
              selectVoteAccount(a.validator).localeCompare(
                selectVoteAccount(b.validator),
              ),
          },
          {
            header: 'Name',
            headerAttrsFn: () =>
              tooltipAttributes('Validator name (from on-chain identity)'),
            render: item => {
              const va = selectVoteAccount(item.validator)
              const name = nameByVote.get(va) ?? ''
              return (
                <span className={styles.nameCell}>
                  <span className={styles.nameText} title={name}>
                    {name || '—'}
                  </span>
                </span>
              )
            },
            compare: (a, b) =>
              (
                nameByVote.get(selectVoteAccount(a.validator)) ?? ''
              ).localeCompare(
                nameByVote.get(selectVoteAccount(b.validator)) ?? '',
              ),
          },
          {
            header: 'St. Bid',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Static bid for 1000 SOL set by the validator in Bond configuration.<br/>' +
                  'The bid active at the slot the auction runs is what you pay for that epoch’s activating stake.',
              ),
            render: item => (
              <>{formatSolAmount(selectBid(item.validator), 4)}</>
            ),
            compare: (a, b) => selectBid(a.validator) - selectBid(b.validator),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Bond [☉]',
            headerAttrsFn: () => tooltipAttributes('Bond Balance.'),
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
                'Epochs of bond runway above the minimum required reserve. At zero, Marinade starts undelegating stake and charging fees to cover the costs. Negative means the bond is short of the reserve by that many epochs of bid payments — top up to avoid further fee charges.',
              ),
            cellAttrsFn: item =>
              tooltipAttributes(
                buildBondBreakdownTooltip(
                  item.validator,
                  minBondEpochs,
                  idealBondEpochs,
                  auctionResult.winningTotalPmpe,
                  dcSamConfig.bondRiskFeeMult,
                  item.validator.bondState,
                  !item.isGhost &&
                    simulatedValidator === selectVoteAccount(item.validator),
                ),
              ),
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
            background: item => {
              const bond = selectBondSize(item.validator)
              if (bond <= 0) return Color.GREY
              if (!item.validator.auctionStake.marinadeSamTargetSol)
                return Color.GREY
              return item.validator.bondState
            },
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
              tooltipAttributes(
                'The currently active stake delegated by SAM. Arrow indicates expected change next epoch — see tooltip for breakdown.',
              ),
            cellAttrsFn: item =>
              tooltipAttributes(
                buildSamActiveTooltip(
                  item.validator,
                  !item.isGhost &&
                    simulatedValidator === selectVoteAccount(item.validator),
                ),
              ),
            render: item => <StakeChangeIndicator validator={item.validator} />,
            compare: (a, b) =>
              selectSamActiveStake(a.validator) -
              selectSamActiveStake(b.validator),
            alignment: Alignment.RIGHT,
          },
          ...(level === UserLevel.Expert
            ? [
                {
                  header: 'SAM Target [☉]',
                  headerAttrsFn: () =>
                    tooltipAttributes(
                      'The target stake to be received based off the auction.',
                    ),
                  cellAttrsFn: (item: DisplayValidator) =>
                    tooltipAttributes(selectConstraintText(item.validator)),
                  render: (item: DisplayValidator) => (
                    <>
                      {formatSolAmount(selectSamTargetStake(item.validator), 0)}
                    </>
                  ),
                  compare: (a: DisplayValidator, b: DisplayValidator) =>
                    selectSamTargetStake(a.validator) -
                    selectSamTargetStake(b.validator),
                  alignment: Alignment.RIGHT,
                },
              ]
            : []),
        ]}
        defaultOrder={DEFAULT_ORDER}
        onOrderChange={handleOrderChange}
        presorted
      />
    </div>
  )
}

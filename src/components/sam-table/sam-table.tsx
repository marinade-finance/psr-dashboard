import round from 'lodash.round'
import React, { useState, useCallback, useEffect } from 'react'

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
} from 'src/services/sam'

import styles from './sam-table.module.css'
import { tooltipAttributes } from '../../services/utils'
import { ComplexMetric } from '../complex-metric/complex-metric'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'

export type SimulationInputs = {
  voteAccount: string
  bidPmpe: number | null
  inflationCommission: number | null
  mevCommission: number | null
  blockRewardsCommission: number | null
}

type Props = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  showSimulator: boolean
  onToggleSimulator: () => void
  onRunSimulation: (inputs: SimulationInputs) => void
  onResetSimulation: () => void
  isSimulating: boolean
  isLoading: boolean
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  epochsPerYear,
  dsSamConfig,
  level,
  showSimulator,
  onToggleSimulator,
  onRunSimulation,
  onResetSimulation,
  isSimulating,
  isLoading,
}) => {
  console.log(auctionResult)
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

  // Simulation input state
  const [voteAccount, setVoteAccount] = useState('')
  const [bidPmpe, setBidPmpe] = useState<string>('')
  const [inflationCommission, setInflationCommission] = useState<string>('')
  const [mevCommission, setMevCommission] = useState<string>('')
  const [blockRewardsCommission, setBlockRewardsCommission] =
    useState<string>('')

  // Pre-populate fields when vote account matches an existing validator
  useEffect(() => {
    if (!voteAccount || voteAccount.length < 32) return

    const validator = validators.find(v => v.voteAccount === voteAccount)
    if (validator) {
      setBidPmpe(validator.revShare.bidPmpe.toString())
      setInflationCommission(
        (validator.inflationCommissionDec * 100).toString(),
      )
      if (validator.mevCommissionDec !== null) {
        setMevCommission((validator.mevCommissionDec * 100).toString())
      }
      if (validator.blockRewardsCommissionDec !== null) {
        setBlockRewardsCommission(
          (validator.blockRewardsCommissionDec * 100).toString(),
        )
      }
    }
  }, [voteAccount, validators])

  const handleRunSimulation = useCallback(() => {
    onRunSimulation({
      voteAccount,
      bidPmpe: bidPmpe ? parseFloat(bidPmpe) : null,
      inflationCommission: inflationCommission
        ? parseFloat(inflationCommission)
        : null,
      mevCommission: mevCommission ? parseFloat(mevCommission) : null,
      blockRewardsCommission: blockRewardsCommission
        ? parseFloat(blockRewardsCommission)
        : null,
    })
  }, [
    voteAccount,
    bidPmpe,
    inflationCommission,
    mevCommission,
    blockRewardsCommission,
    onRunSimulation,
  ])

  const handleReset = useCallback(() => {
    setVoteAccount('')
    setBidPmpe('')
    setInflationCommission('')
    setMevCommission('')
    setBlockRewardsCommission('')
    onResetSimulation()
  }, [onResetSimulation])

  const validatorsWithBond = validators
    .filter(validator => selectBondSize(validator) > 0)
    .map(v => {
      return {
        ...v,
        bondState: bondColorState(v, bondObligationSafetyMult),
      }
    })

  const samStakeValidators = validatorsWithBond.filter(
    v => v.auctionStake.marinadeSamTargetSol,
  )
  const avgStake =
    samStakeValidators.reduce(
      (agg, v) => agg + v.auctionStake.marinadeSamTargetSol,
      0,
    ) / samStakeValidators.length
  const reputationInflationFactor =
    samStakeValidators.reduce(
      (agg, v) => agg + v.values.adjSpendRobustReputationInflationFactor,
      0,
    ) / samStakeValidators.length

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
        <Metric
          label="Rep. Infl."
          value={`${round(reputationInflationFactor, 1)}`}
          {...tooltipAttributes(
            'How much do we have to inflate reputation so that our TVL fits into the induced limits',
          )}
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
    <div className={styles.tableWrap}>
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
        <button className={styles.simulatorToggle} onClick={onToggleSimulator}>
          {showSimulator ? 'Hide Simulator' : 'Run Simulation'}
        </button>
        {isSimulating && (
          <span className={styles.simulationBadge}>Simulation Active</span>
        )}
      </div>

      {showSimulator && (
        <div className={styles.simulatorSection}>
          <div className={styles.simulatorHeader}>
            <h3>SAM Auction Simulator</h3>
            <p>
              Override bid and commission values for a validator to simulate
              auction results
            </p>
          </div>
          <div className={styles.simulatorForm}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Vote Account</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter vote account address"
                value={voteAccount}
                onChange={e => setVoteAccount(e.target.value)}
              />
            </div>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Bid PMPE (SOL per 1000 delegated)
                </label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g., 0.05"
                  step="0.001"
                  value={bidPmpe}
                  onChange={e => setBidPmpe(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Inflation Commission (%)
                </label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g., 5"
                  step="0.1"
                  min="0"
                  max="100"
                  value={inflationCommission}
                  onChange={e => setInflationCommission(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>MEV Commission (%)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g., 5"
                  step="0.1"
                  min="0"
                  max="100"
                  value={mevCommission}
                  onChange={e => setMevCommission(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Block Rewards Commission (%)
                </label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g., 5"
                  step="0.1"
                  min="0"
                  max="100"
                  value={blockRewardsCommission}
                  onChange={e => setBlockRewardsCommission(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={styles.primaryButton}
                onClick={handleRunSimulation}
                disabled={!voteAccount || isLoading}
              >
                {isLoading ? 'Running...' : 'Run SAM'}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <Table
        data={validatorsWithBond}
        columns={[
          {
            header: 'Validator',
            headerAttrsFn: () => tooltipAttributes('Validator Vote Account'),
            render: validator => (
              <span className={styles.pubkey}>
                {selectVoteAccount(validator)}
              </span>
            ),
            compare: (a, b) =>
              selectVoteAccount(a).localeCompare(selectVoteAccount(b)),
          },
          {
            header: 'Infl.',
            headerAttrsFn: () =>
              tooltipAttributes('Validator Inflation Commission'),
            cellAttrsFn: validator =>
              tooltipAttributes(
                `On chain commission: ${formattedOnChainCommission(validator)}<br/>` +
                  `In-bond commission: ${formattedInBondCommission(validator)}<br/>` +
                  `Effective inflation commission PMPE: ${selectCommissionPmpe(validator)}`,
              ),
            render: validator => (
              <>{formatPercentage(selectCommission(validator), 0)}</>
            ),
            compare: (a, b) => selectCommission(a) - selectCommission(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'MEV',
            cellAttrsFn: validator =>
              tooltipAttributes(
                `On chain commission: ${formattedOnChainMevCommission(validator)}<br/>` +
                  `In-bond commission: ${formattedInBondMevCommission(validator)}<br/>` +
                  `Effective MEV commission PMPE: ${selectMevCommissionPmpe(validator)}`,
              ),
            render: validator => <>{formattedMevCommission(validator)}</>,
            compare: (a, b) =>
              (selectMevCommission(a) ?? 100) - (selectMevCommission(b) ?? 100),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Block',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Block rewards commission can be in Bond configuration solely.',
              ),
            cellAttrsFn: validator =>
              tooltipAttributes(
                `Effective block rewards commission PMPE: ${selectBlockRewardsCommissionPmpe(validator)}`,
              ),
            render: validator => (
              <>{formattedBlockRewardsCommission(validator)}</>
            ),
            compare: (a, b) =>
              (selectBlockRewardsCommission(a) ?? 100) -
              (selectBlockRewardsCommission(b) ?? 100),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'St. Bid',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Static bid for 1000 SOL set by the validator in Bond configuration.',
              ),
            cellAttrsFn: () => tooltipAttributes('Maximum bid for 1000 SOL.'),
            render: validator => (
              <>{formatSolAmount(selectBid(validator), 4)}</>
            ),
            compare: (a, b) => selectBid(a) - selectBid(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Bond [☉]',
            headerAttrsFn: () => tooltipAttributes('Bond Balance.'),
            cellAttrsFn: validator =>
              tooltipAttributes(bondTooltip(validator.bondState)),
            render: validator => (
              <>{formatSolAmount(selectBondSize(validator), 0)}</>
            ),
            compare: (a, b) => selectBondSize(a) - selectBondSize(b),
            alignment: Alignment.RIGHT,
          },
          // {
          //   header: 'Rep.',
          //   headerAttrsFn: () =>
          //     tooltipAttributes(
          //       'Validator Reputation. Not used in the auction at the moment.',
          //     ),
          //   render: validator => (
          //     <>{formatSolAmount(selectSpendRobustReputation(validator), 0)}</>
          //   ),
          //   compare: (a, b) =>
          //     selectSpendRobustReputation(a) - selectSpendRobustReputation(b),
          //   alignment: Alignment.RIGHT,
          //   cellAttrsFn: validator =>
          //     tooltipAttributes(spendRobustReputationTooltip(validator)),
          // },
          {
            header: 'Max APY',
            headerAttrsFn: () =>
              tooltipAttributes(
                "APY calculated using this validator's bid and commission configuration.",
              ),
            render: validator => (
              <>
                {formatPercentage(
                  selectMaxAPY(validator, epochsPerYear),
                  2,
                  0.5,
                )}
              </>
            ),
            compare: (a, b) =>
              selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'SAM Active [☉]',
            headerAttrsFn: () =>
              tooltipAttributes('The currently active stake delegated by SAM.'),
            render: validator => (
              <>{formatSolAmount(selectSamActiveStake(validator), 0)}</>
            ),
            compare: (a, b) =>
              selectSamActiveStake(a) - selectSamActiveStake(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'SAM Target [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'The target stake to be received based off the auction.',
              ),
            cellAttrsFn: validator =>
              tooltipAttributes(selectConstraintText(validator)),
            render: validator => (
              <>{formatSolAmount(selectSamTargetStake(validator), 0)}</>
            ),
            compare: (a, b) =>
              selectSamTargetStake(a) - selectSamTargetStake(b),
            alignment: Alignment.RIGHT,
          },
          // TODO: double check in DS SAM and validator bonds if static bid is used correctly in claiming from bond
          {
            header: 'Eff. Bid [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Effective bid used in the auction calculation, combining the static bid and commission settings. ' +
                  'This value is used to rank validators in the auction and is shown as cost per 1000 SOL. ' +
                  'It is not the actual amount the validator will pay from the bond, as that depends on the real stake delegated to the validator for the static bid, ' +
                  'and on the rewards earned in the previous epoch for the commission configuration.',
              ),
            render: validator => (
              <>{formatSolAmount(selectEffectiveBid(validator), 4)}</>
            ),
            compare: (a, b) => selectEffectiveBid(a) - selectEffectiveBid(b),
            alignment: Alignment.RIGHT,
          },
        ]}
        defaultOrder={[
          [7, OrderDirection.DESC],
          [5, OrderDirection.DESC],
        ]}
        showRowNumber={true}
      />
    </div>
  )
}

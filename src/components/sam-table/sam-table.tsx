import round from 'lodash.round'
import React from 'react'

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
} from 'src/services/sam'

import styles from './sam-table.module.css'
import { tooltipAttributes } from '../../services/utils'
import { ComplexMetric } from '../complex-metric/complex-metric'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { EditedValidators, PendingEdits } from 'src/pages/sam'

type Props = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  isEditMode: boolean
  onToggleEditMode: () => void
  isSimulating: boolean
  isLoading: boolean
  editedValidators: EditedValidators
  pendingEdits: PendingEdits
  onFieldChange: (
    voteAccount: string,
    field:
      | 'inflationCommission'
      | 'mevCommission'
      | 'blockRewardsCommission'
      | 'bidPmpe',
    value: string,
  ) => void
  onFieldBlur: (
    voteAccount: string,
    field:
      | 'inflationCommission'
      | 'mevCommission'
      | 'blockRewardsCommission'
      | 'bidPmpe',
    value: string,
    originalValue: number | null,
  ) => void
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  epochsPerYear,
  dsSamConfig,
  level,
  isEditMode,
  onToggleEditMode,
  isSimulating,
  isLoading,
  editedValidators,
  pendingEdits,
  onFieldChange,
  onFieldBlur,
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

  // Helper to get input value - either from pending edits or original data
  const getInputValue = (
    voteAccount: string,
    field:
      | 'inflationCommission'
      | 'mevCommission'
      | 'blockRewardsCommission'
      | 'bidPmpe',
    originalValue: string,
  ): string => {
    const pending = pendingEdits.get(voteAccount)
    if (pending && pending[field] !== undefined) {
      return pending[field]
    }
    return originalValue
  }

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
        <div className={styles.simulatorToggleWrap}>
          <button
            className={`${styles.simulatorToggle} ${isSimulating ? styles.simulatorToggleActive : ''}`}
            onClick={onToggleEditMode}
            disabled={isLoading}
          >
            {isLoading
              ? 'Running...'
              : isEditMode
                ? 'Exit Simulation'
                : 'Run Simulation'}
          </button>
          {isSimulating && (
            <span className={styles.simulationNote}>(simulation active)</span>
          )}
        </div>
      </div>

      <Table
        data={validatorsWithBond}
        columns={[
          {
            header: 'Validator',
            headerAttrsFn: () => tooltipAttributes('Validator Vote Account'),
            render: validator => {
              const voteAccount = selectVoteAccount(validator)
              const isEdited = editedValidators.has(voteAccount)
              return (
                <span
                  className={`${styles.pubkey} ${isEdited ? styles.pubkeySimulated : ''}`}
                >
                  {voteAccount}
                </span>
              )
            },
            compare: (a, b) =>
              selectVoteAccount(a).localeCompare(selectVoteAccount(b)),
          },
          {
            header: 'Infl.',
            headerAttrsFn: () =>
              tooltipAttributes('Validator Inflation Commission'),
            cellAttrsFn: validator =>
              tooltipAttributes(
                `${overridesCommissionMessage(validator)}` +
                  `On chain commission: ${formattedOnChainCommission(validator)}<br/>` +
                  `In-bond commission: ${formattedInBondCommission(validator)}<br/>` +
                  `Effective inflation commission PMPE: ${selectCommissionPmpe(validator)}`,
              ),
            render: validator => {
              const voteAccount = selectVoteAccount(validator)
              const originalValue = selectCommission(validator) * 100
              if (isEditMode) {
                const inputValue = getInputValue(
                  voteAccount,
                  'inflationCommission',
                  originalValue.toString(),
                )
                return (
                  <input
                    type="number"
                    className={styles.inlineInput}
                    value={inputValue}
                    step="0.1"
                    min="0"
                    max="100"
                    onChange={e =>
                      onFieldChange(
                        voteAccount,
                        'inflationCommission',
                        e.target.value,
                      )
                    }
                    onBlur={e =>
                      onFieldBlur(
                        voteAccount,
                        'inflationCommission',
                        e.target.value,
                        originalValue,
                      )
                    }
                  />
                )
              }
              return <>{formatPercentage(selectCommission(validator), 0)}</>
            },
            compare: (a, b) => selectCommission(a) - selectCommission(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'MEV',
            cellAttrsFn: validator =>
              tooltipAttributes(
                `${overridesMevCommissionMessage(validator)}` +
                  `On chain commission: ${formattedOnChainMevCommission(validator)}<br/>` +
                  `In-bond commission: ${formattedInBondMevCommission(validator)}<br/>` +
                  `Effective MEV commission PMPE: ${selectMevCommissionPmpe(validator)}`,
              ),
            render: validator => {
              const voteAccount = selectVoteAccount(validator)
              const mevCommission = selectMevCommission(validator)
              const originalValue =
                mevCommission !== null ? mevCommission * 100 : null
              if (isEditMode) {
                const inputValue = getInputValue(
                  voteAccount,
                  'mevCommission',
                  originalValue?.toString() ?? '',
                )
                return (
                  <input
                    type="number"
                    className={styles.inlineInput}
                    value={inputValue}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="-"
                    onChange={e =>
                      onFieldChange(
                        voteAccount,
                        'mevCommission',
                        e.target.value,
                      )
                    }
                    onBlur={e =>
                      onFieldBlur(
                        voteAccount,
                        'mevCommission',
                        e.target.value,
                        originalValue,
                      )
                    }
                  />
                )
              }
              return <>{formattedMevCommission(validator)}</>
            },
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
                `${overridesBlockRewardsCommissionMessage(validator)}` +
                  `Effective block rewards commission PMPE: ${selectBlockRewardsCommissionPmpe(validator)}`,
              ),
            render: validator => {
              const voteAccount = selectVoteAccount(validator)
              const blockCommission = selectBlockRewardsCommission(validator)
              const originalValue =
                blockCommission !== null ? blockCommission * 100 : null
              if (isEditMode) {
                const inputValue = getInputValue(
                  voteAccount,
                  'blockRewardsCommission',
                  originalValue?.toString() ?? '',
                )
                return (
                  <input
                    type="number"
                    className={styles.inlineInput}
                    value={inputValue}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="-"
                    onChange={e =>
                      onFieldChange(
                        voteAccount,
                        'blockRewardsCommission',
                        e.target.value,
                      )
                    }
                    onBlur={e =>
                      onFieldBlur(
                        voteAccount,
                        'blockRewardsCommission',
                        e.target.value,
                        originalValue,
                      )
                    }
                  />
                )
              }
              return <>{formattedBlockRewardsCommission(validator)}</>
            },
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
            cellAttrsFn: validator =>
              tooltipAttributes(
                `${overridesBidCpmpeMessage(validator)}` +
                  `Maximum bid ${selectBid(validator)} for 1000 SOL.`,
              ),
            render: validator => {
              const voteAccount = selectVoteAccount(validator)
              const originalValue = selectBid(validator)
              if (isEditMode) {
                const inputValue = getInputValue(
                  voteAccount,
                  'bidPmpe',
                  originalValue.toString(),
                )
                return (
                  <input
                    type="number"
                    className={styles.inlineInput}
                    value={inputValue}
                    step="0.001"
                    min="0"
                    onChange={e =>
                      onFieldChange(voteAccount, 'bidPmpe', e.target.value)
                    }
                    onBlur={e =>
                      onFieldBlur(
                        voteAccount,
                        'bidPmpe',
                        e.target.value,
                        originalValue,
                      )
                    }
                  />
                )
              }
              return <>{formatSolAmount(selectBid(validator), 4)}</>
            },
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

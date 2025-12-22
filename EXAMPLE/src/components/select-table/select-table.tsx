import React, { useState, useEffect } from 'react'

import {
  formatPercentage,
  formatSolAmount,
  MAX_EPOCH_RANGE,
  tooltipAttributes,
} from 'src/utils'

import styles from './select-table.module.css'
import { Metric } from '../metric/metric'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { SelectDataValidator } from 'src/services/select-validators'

type Props = {
  validators: SelectDataValidator[]
  fromEpoch?: number
  toEpoch?: number
  onFromEpochChange: (epoch: number | undefined) => void
  onToEpochChange: (epoch: number | undefined) => void
}

function verifyRange(
  fromEpoch: number | undefined,
  toEpoch: number | undefined,
): boolean {
  if (fromEpoch !== undefined && toEpoch !== undefined) {
    if (toEpoch < fromEpoch) {
      console.error(`Invalid epoch range: ${fromEpoch} - ${toEpoch}`)
      return false
    }
  }
  return true
}

function convertEpoch(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') {
    return undefined
  }
  const num = Number(trimmed)
  if (Number.isNaN(num)) {
    console.error(`Invalid epoch number: ${trimmed}`)
    return undefined
  }
  if (num < 0) {
    console.error(`Negative epoch number not allowed: ${num}`)
    return undefined
  }
  if (!Number.isInteger(num)) {
    console.error(`Non-integer epoch number not allowed: ${num}`)
    return undefined
  }
  return num
}

function findEpochRange(validators: SelectDataValidator[]): [number, number] {
  return validators.length === 0
    ? ([0, 0] as [number, number]) // or whatever default you want
    : validators.reduce(
        (range, validator) => [
          Math.min(range[0], validator.epoch),
          Math.max(range[1], validator.epoch),
        ],
        [Infinity, -Infinity] as [number, number],
      )
}

function findEpochRangeAsString(validators: SelectDataValidator[]): string {
  const epochRange = findEpochRange(validators)
  return `[${epochRange[0]}, ${epochRange[1]}]`
}

export const SelectTable: React.FC<Props> = ({
  validators,
  fromEpoch,
  toEpoch,
  onFromEpochChange,
  onToEpochChange,
}) => {
  const selectValidators = validators.filter(
    ({ isInSelectSet }) => isInSelectSet,
  )
  const [validatorFilter, setValidatorFilter] = useState('')

  const filter = validatorFilter.trim().toLocaleLowerCase()
  const filterString = filter ? `'${filter}'` : '(none)'
  const data = selectValidators.filter(({ voteAccount, name }) => {
    return (
      voteAccount.toLowerCase().includes(filter) ||
      name?.toLocaleLowerCase().includes(filter)
    )
  })

  const selectEpochs = findEpochRangeAsString(selectValidators)
  const filteredEpochs = findEpochRangeAsString(data)
  let fromEpochDefined = fromEpoch
  let toEpochDefined = toEpoch
  if (fromEpochDefined === undefined || toEpochDefined === undefined) {
    const epochRange = findEpochRange(data)
    fromEpochDefined = fromEpochDefined ?? epochRange[0]
    toEpochDefined = toEpochDefined ?? epochRange[1]
  }

  // Propagate initially calculated epoch values to parent state
  useEffect(() => {
    if (data.length > 0 && (fromEpoch === undefined || toEpoch === undefined)) {
      const [rangeStart, rangeEnd] = findEpochRange(data)
      if (fromEpoch === undefined) {
        onFromEpochChange(rangeStart)
      }
      if (toEpoch === undefined) {
        onToEpochChange(rangeEnd)
      }
    }
  }, [data, fromEpoch, toEpoch, onFromEpochChange, onToEpochChange])
  // Update input fields when API returns different epoch range than requested
  useEffect(() => {
    if (data.length > 0) {
      const [actualFromEpoch, actualToEpoch] = findEpochRange(data)
      if (fromEpoch !== actualFromEpoch) {
        onFromEpochChange(actualFromEpoch)
      }
      if (toEpoch !== actualToEpoch) {
        onToEpochChange(actualToEpoch)
      }
    }
  }, [data])

  const selectSettlementsAmount = selectValidators.reduce(
    (total, validator) => total + validator.chargedSumSol,
    0,
  )
  const filteredSelectSettlementsAmount = data.reduce(
    (total, validator) => total + validator.chargedSumSol,
    0,
  )
  const filteredPnL = data.reduce(
    (total, validator) => total + validator.validatorPnlSol,
    0,
  )

  const totalStake = data.reduce(
    (sum, v) => sum + v.stake.institutionalActiveSol,
    0,
  )
  const weightedApy =
    data.length === 0
      ? 0
      : data.reduce(
          (sum, v) => sum + v.rewards.apy * v.stake.institutionalActiveSol,
          0,
        ) / totalStake

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { compare: compareLocal } = new Intl.Collator('en', {
    sensitivity: 'base',
  })

  return (
    <div className={styles.tableWrap}>
      <div className={styles.metricWrap}>
        <Metric
          label="Total Events"
          value={selectValidators.length.toString()}
          {...tooltipAttributes(
            `Total number of Settlement events in epoch range ${selectEpochs}`,
          )}
        />
        <Metric
          label="Total Settled"
          value={`☉ ${formatSolAmount(selectSettlementsAmount)}`}
          {...tooltipAttributes(
            `Total amount of SOL in epoch range ${selectEpochs}`,
          )}
        />
        <Metric
          label="Events"
          value={data.length.toString()}
          {...tooltipAttributes(
            `Number of Settlement events in epoch range ${filteredEpochs} and validator name/address filter ${filterString}`,
          )}
        />
        <Metric
          label="Settled"
          value={`☉ ${formatSolAmount(filteredSelectSettlementsAmount)}`}
          {...tooltipAttributes(
            `Total amount of SOL in epoch range ${filteredEpochs} and validator name/address filter ${filterString}`,
          )}
        />
        <Metric
          label="Weighted APY"
          value={formatPercentage(weightedApy)}
          {...tooltipAttributes(
            `Weighted APY by filtered validators in epoch range ${filteredEpochs}`,
          )}
        />
        <Metric
          label="PnL Overall"
          value={`☉ ${formatSolAmount(filteredPnL)}`}
          {...tooltipAttributes(
            `Amount of SOL that was earned by the validator in epoch range ${filteredEpochs} and validator name/address filter ${filterString}`,
          )}
        />
      </div>
      <div className={styles.filters}>
        <fieldset>
          <legend>Validator filter</legend>
          <input
            type="text"
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
          />
        </fieldset>
        <fieldset>
          <legend
            {...tooltipAttributes(
              `Max epoch filter range is ${MAX_EPOCH_RANGE}`,
            )}
          >
            Epoch filter
          </legend>
          <input
            id="fromEpochInput"
            key={`from-${fromEpochDefined}`}
            className={styles.epochFilter}
            type="number"
            defaultValue={fromEpochDefined}
            onBlur={e => {
              const newFromEpoch = convertEpoch(e.target.value)
              if (
                newFromEpoch !== undefined &&
                verifyRange(newFromEpoch, toEpochDefined)
              ) {
                onFromEpochChange(newFromEpoch)
              }
            }}
          />
          <input
            id="toEpochInput"
            key={`to-${toEpochDefined}`}
            className={styles.epochFilter}
            type="number"
            defaultValue={toEpochDefined}
            onBlur={e => {
              const newToEpoch = convertEpoch(e.target.value)
              if (
                newToEpoch !== undefined &&
                verifyRange(fromEpochDefined, newToEpoch)
              ) {
                onToEpochChange(newToEpoch)
              }
            }}
          />
        </fieldset>
      </div>
      <Table
        data={data}
        columns={[
          {
            header: 'Epoch',
            render: ({ epoch }) => <>{epoch}</>,
            compare: (a, b) => a.epoch - b.epoch,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Validator',
            cellAttrsFn: ({ voteAccount }) => tooltipAttributes(voteAccount),
            render: ({ voteAccount }) => (
              <span className={styles.pubkey}>{voteAccount}</span>
            ),
            compare: (a, b) => compareLocal(a.voteAccount, b.voteAccount),
          },
          {
            header: 'Name',
            // tooltip length condition should be synced with select-table.module.css .name max-width
            cellAttrsFn: ({ name }) =>
              name.length > 18 ? tooltipAttributes(name) : {},
            render: ({ name }) => <span className={styles.name}>{name}</span>,
            compare: (a, b) => compareLocal(a.name, b.name),
          },
          {
            header: 'Settled [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'The total amount of SOL settled (charged) from the validator’s bond in the epoch, equal to the sum of amounts paid To Stakers and To DAO',
              ),
            render: ({ chargedSumSol }) => (
              <>{formatSolAmount(chargedSumSol)}</>
            ),
            compare: (a, b) => a.chargedSumSol - b.chargedSumSol,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'To Stakers [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Portion of the Settlement that goes to Stakers.',
              ),
            render: ({ toStakersSumSol }) => (
              <>{formatSolAmount(toStakersSumSol)}</>
            ),
            compare: (a, b) => a.toStakersSumSol - b.toStakersSumSol,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'To DAO [☉]',
            headerAttrsFn: () =>
              tooltipAttributes('Portion of the Settlement that goes to DAO.'),
            render: ({ toDaoSumSol }) => <>{formatSolAmount(toDaoSumSol)}</>,
            compare: (a, b) => a.toDaoSumSol - b.toDaoSumSol,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'PSR [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'The portion of the settlement that represents a penalty on protected stake. The PSR fee is distributed as part of the amounts paid to the DAO and to stakers, and it is already included in the settled amount.',
              ),
            render: ({ psrFeeSumSol }) => <>{formatSolAmount(psrFeeSumSol)}</>,
            compare: (a, b) => a.psrFeeSumSol - b.psrFeeSumSol,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Validator PnL [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Amount of SOL earned by the validator as profit in a given epoch.',
              ),
            render: ({ validatorPnlSol }) => (
              <>{formatSolAmount(validatorPnlSol)}</>
            ),
            compare: (a, b) => a.validatorPnlSol - b.validatorPnlSol,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Select APY',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Annualized yield of the validator for the epoch.',
              ),
            render: ({ rewards }) => <>{formatPercentage(rewards.apy)}</>,
            compare: (a, b) => a.rewards.apy - b.rewards.apy,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'TVL [☉]',
            headerAttrsFn: () =>
              tooltipAttributes(
                'Amount of stake delegated to the validator by institutional stakers in the Select program during the epoch.',
              ),
            render: ({ stake }) => (
              <>{formatSolAmount(stake.institutionalActiveSol)}</>
            ),
            compare: (a, b) =>
              a.stake.institutionalActiveSol - b.stake.institutionalActiveSol,
            alignment: Alignment.RIGHT,
          },
        ]}
        defaultOrder={[
          [0, OrderDirection.DESC],
          [3, OrderDirection.DESC],
        ]}
      />
    </div>
  )
}

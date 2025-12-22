import React from 'react'

import {
  selectInflationCommission,
  selectMevCommission,
  selectName,
  selectApiInstitutionalStake,
  selectVoteAccount,
  calcApiInstitutionalTvl,
} from 'src/services/bond-data-validators'
import { ALLOWED_STAKE_PER_BOND_RATIO, bondTooltip } from 'src/services/bonds'
import { calcApiApy } from 'src/services/load-data'
import { formatPercentage, formatSolAmount, tooltipAttributes } from 'src/utils'

import styles from './bonds-table.module.css'
import { Metric } from '../metric/metric'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { BondDataValidator } from 'src/services/bond-data-validators'
import type { ApiApy } from 'src/services/validators-api'

type Props = {
  validators: BondDataValidator[]
  apiApy: ApiApy
}

export const BondsTable: React.FC<Props> = ({ validators, apiApy }) => {
  const selectValidators = validators.filter(v => v.hasBondAndSelect())
  const apy = calcApiApy(apiApy)
  const tvl = calcApiInstitutionalTvl(selectValidators)

  const bondsTotal = selectValidators.reduce(
    (total, { bond }) => total + bond.effectiveAmountSol,
    0,
  )

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { compare: compareLocal } = new Intl.Collator('en', {
    sensitivity: 'base',
  })

  return (
    <div className={styles.tableWrap}>
      <div className={styles.metricWrap}>
        <Metric
          label="Epoch"
          value={
            selectValidators.length > 0
              ? String(selectValidators[0].epoch)
              : 'N/A'
          }
          {...tooltipAttributes(
            'Epoch of the latest calculated data. ' +
              `On-chain Bonds data loaded from chain at ${selectValidators.length > 0 ? String(selectValidators[0].bond.updatedAt) : 'N/A'}`,
          )}
        />
        <Metric
          label="Validators"
          value={`${selectValidators.length}`}
          {...tooltipAttributes('Number of validators in the Select set')}
        />
        <Metric
          label="TVL"
          value={`☉ ${formatSolAmount(tvl)}`}
          {...tooltipAttributes('Select TVL')}
        />
        <Metric
          label="APY"
          value={`${formatPercentage(apy)}`}
          {...tooltipAttributes('Aggregated Select APY')}
        />
        <Metric
          label="Total bonds balance"
          value={formatSolAmount(bondsTotal)}
          {...tooltipAttributes(
            'Total amount of SOL in Select validator bonds',
          )}
        />
      </div>
      <Table
        data={selectValidators}
        columns={[
          {
            header: 'Validator',
            render: validator => (
              <span className={styles.pubkey}>
                {selectVoteAccount(validator)}
              </span>
            ),
            compare: (a, b) =>
              compareLocal(selectVoteAccount(a), selectVoteAccount(b)),
          },
          {
            header: 'Name',
            render: validator => <>{selectName(validator)}</>,
            compare: (a, b) => compareLocal(selectName(a), selectName(b)),
            alignment: Alignment.LEFT,
          },
          {
            header: 'Select TVL',
            render: validator => (
              <>{formatSolAmount(selectApiInstitutionalStake(validator))}</>
            ),
            compare: (a, b) =>
              selectApiInstitutionalStake(a) - selectApiInstitutionalStake(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Infl. / MEV commissions',
            render: validator => (
              <>{`${formatPercentage(selectInflationCommission(validator), 0)} / ${formatPercentage(selectMevCommission(validator), 0)}`}</>
            ),
            compare: (a, b) =>
              selectInflationCommission(a) +
              selectMevCommission(a) -
              selectInflationCommission(b) -
              selectMevCommission(b),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Bond amount',
            headerAttrsFn: () =>
              tooltipAttributes(
                `The amount of SOL held in the validator's bond account. It is expected to be one SOL per each ${ALLOWED_STAKE_PER_BOND_RATIO} SOLs staked.`,
              ),
            cellAttrsFn: validator =>
              tooltipAttributes(bondTooltip(validator.bond.bondState)),
            background: validator => validator.bond.bondState.status,
            render: validator => (
              <>{formatSolAmount(validator.bond.effectiveAmountSol)}</>
            ),
            compare: (a, b) =>
              a.bond.effectiveAmountSol - b.bond.effectiveAmountSol,
            alignment: Alignment.RIGHT,
          },
        ]}
        defaultOrder={[
          [2, OrderDirection.DESC],
          [1, OrderDirection.ASC],
        ]}
        showRowNumber={true}
      />
    </div>
  )
}

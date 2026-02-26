import round from 'lodash.round'
import React from 'react'

import { UserLevel } from 'src/components/navigation/navigation'
import {
  formatBps,
  formatPercentage,
  formatSolAmount,
  lamportsToSol,
} from 'src/format'
import { selectEffectiveAmount } from 'src/services/bonds'
import { selectEffectiveBid, selectEffectiveCost } from 'src/services/sam'
import {
  selectProtectedStake,
  selectMaxStakeWanted,
  selectMaxProtectedStake,
} from 'src/services/validator-with-bond'
import {
  selectLiquidMarinadeStake,
  selectName,
  selectNativeMarinadeStake,
  selectTotalMarinadeStake,
  selectVoteAccount,
} from 'src/services/validators'

import { HelpTip } from '../help-tip/help-tip'
import { Metric } from '../metric/metric'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { ValidatorWithBond } from 'src/services/validator-with-bond'

type Props = {
  data: ValidatorWithBond[]
  level: UserLevel
}

export const ValidatorBondsTable: React.FC<Props> = ({ data, level }) => {
  const totalMarinadeStake = data.reduce(
    (sum, { validator }) => sum + selectTotalMarinadeStake(validator),
    0,
  )
  const totalProtectedStake = data.reduce(
    (sum, validatorWithBond) => sum + selectProtectedStake(validatorWithBond),
    0,
  )
  const totalMaxProtectedStake = data.reduce(
    (sum, entry) => sum + selectMaxProtectedStake(entry),
    0,
  )
  const effectiveBalance = Math.round(
    data.reduce(
      (sum, { bond }) => sum + (bond ? selectEffectiveAmount(bond) : 0),
      0,
    ),
  )
  const totalFundedBonds = data.filter(
    ({ bond }) => (bond ? selectEffectiveAmount(bond) : 0) > 0,
  ).length

  let expertMetrics
  let expertColumns: {
    header: string
    render: (entry: ValidatorWithBond) => JSX.Element
    compare: (a: ValidatorWithBond, b: ValidatorWithBond) => number
    alignment: Alignment
  }[] = []
  if (level === UserLevel.Expert) {
    expertMetrics = (
      <>
        <HelpTip text="How much of Marinade's stake can be potentially protected if all bonds in the system are used">
          <Metric
            label="Max Protectable Stake"
            value={formatPercentage(
              totalMaxProtectedStake / totalMarinadeStake,
            )}
          />
        </HelpTip>
      </>
    )
    expertColumns = [
      {
        header: 'Max protected stake [☉]',
        render: (entry: ValidatorWithBond) => (
          <>{formatSolAmount(selectMaxProtectedStake(entry))}</>
        ),
        compare: (a: ValidatorWithBond, b: ValidatorWithBond) =>
          selectMaxProtectedStake(a) - selectMaxProtectedStake(b),
        alignment: Alignment.RIGHT,
      },
      {
        header: 'Protected stake [%]',
        render: (validatorWithBond: ValidatorWithBond) => {
          const stake = selectNativeMarinadeStake(validatorWithBond.validator)
          return (
            <>
              {formatPercentage(
                stake > 0 ? selectProtectedStake(validatorWithBond) / stake : 0,
              )}
            </>
          )
        },
        compare: (a: ValidatorWithBond, b: ValidatorWithBond) =>
          selectProtectedStake(a) - selectProtectedStake(b),
        alignment: Alignment.RIGHT,
      },
    ]
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <HelpTip text="Count of currently funded bonds">
          <Metric
            label="Bonds Funded"
            value={totalFundedBonds.toLocaleString()}
          />
        </HelpTip>
        <HelpTip text="Total effective amount of SOL deposited to the bonds">
          <Metric
            label="Bonds Balance"
            value={`☉ ${formatSolAmount(effectiveBalance)}`}
          />
        </HelpTip>
        <HelpTip text="How much stake is distributed by Marinade">
          <Metric
            label="Marinade Stake"
            value={`☉ ${formatSolAmount(totalMarinadeStake)}`}
          />
        </HelpTip>
        <HelpTip text="How much of Marinade's stake is protected by validators' deposits to the bonds">
          <Metric
            label="Protected Stake"
            value={formatPercentage(totalProtectedStake / totalMarinadeStake)}
          />
        </HelpTip>
        <>{expertMetrics}</>
      </div>
      <Table
        data={data}
        columns={[
          {
            header: 'Validator',
            tooltip: 'Validator Vote Account',
            render: ({ validator }) => (
              <span className="inline-block max-w-[200px] text-ellipsis overflow-hidden whitespace-nowrap">
                {selectVoteAccount(validator)}
              </span>
            ),
            compare: (a, b) =>
              selectVoteAccount(a.validator).localeCompare(
                selectVoteAccount(b.validator),
              ),
          },
          {
            header: 'Name',
            render: ({ validator }) => (
              <span className="inline-block max-w-[180px] text-ellipsis overflow-hidden whitespace-nowrap">
                {selectName(validator)}
              </span>
            ),
            compare: (a, b) =>
              selectName(a.validator).localeCompare(selectName(b.validator)),
          },
          {
            header: 'Bond balance [☉]',
            render: ({ bond }) => (
              <>
                {formatSolAmount(
                  Number(
                    lamportsToSol(bond?.effective_amount?.toString() ?? '0'),
                  ),
                )}
              </>
            ),
            compare: (a, b) =>
              Number(a.bond?.effective_amount ?? 0) -
              Number(b.bond?.effective_amount ?? 0),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Max Stake Wanted [☉]',
            tooltip:
              "The max-stake-wanted parameter set up in contract. If not set up, max stake is not limited. The validator won't get more stake than what they set up here. No already delegated stake will be lost by decreasing this setting.",
            render: ({ bond }) => {
              const maxStakeWanted = bond ? selectMaxStakeWanted(bond) : 0
              return (
                <>
                  {maxStakeWanted > 0 ? formatSolAmount(maxStakeWanted) : '-'}
                </>
              )
            },
            compare: ({ bond: a }, { bond: b }) =>
              a && b
                ? selectMaxStakeWanted(a) - selectMaxStakeWanted(b)
                : undefined,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Bond Comm.',
            tooltip:
              'Current commission settings in the bond configuration. If the configured commission is lower ' +
              'than the on-chain commission, the difference is drawn from the funded bond.<br/>' +
              'Ordered by in-bond inflation commission.',
            render: ({ bond }) => {
              const inf = bond?.inflation_commission_bps
              const mev = bond?.mev_commission_bps
              const block = bond?.block_commission_bps
              if (inf == null && mev == null && block == null) {
                return <span className="text-muted-foreground">—</span>
              }
              return (
                <HelpTip
                  text={
                    `Inflation commission: ${formatBps(inf)}<br/>` +
                    `MEV commission: ${formatBps(mev)}<br/>` +
                    `Block rewards commission: ${formatBps(block)}`
                  }
                >
                  <span>
                    {formatBps(inf)} / {formatBps(mev)} / {formatBps(block)}
                  </span>
                </HelpTip>
              )
            },
            compare: compareBondCommissions,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Marinade stake [☉]',
            render: ({ validator }) => (
              <HelpTip
                text={`Native: ${formatSolAmount(selectNativeMarinadeStake(validator))}, Liquid: ${formatSolAmount(selectLiquidMarinadeStake(validator))}`}
              >
                <span>
                  {formatSolAmount(selectTotalMarinadeStake(validator))}
                </span>
              </HelpTip>
            ),
            compare: (a, b) =>
              selectTotalMarinadeStake(a.validator) -
              selectTotalMarinadeStake(b.validator),
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Eff. Cost [☉]',
            tooltip:
              'Estimated total cost per epoch for the SAM stake that this validator received. ' +
              'This estimation does not consider the commission bidding never claims more than the real rewards earned in the epoch. ' +
              'And the potential penalties for rapid bid changes. (sorts by Eff. Bid)',
            render: ({ auction }) => (
              <HelpTip text="Assumed cost per epoch for the SAM stake that this validator received.">
                <span>
                  {auction ? round(selectEffectiveCost(auction), 1) : '-'}
                </span>
              </HelpTip>
            ),
            compare: ({ auction: a }, { auction: b }) =>
              a && b
                ? selectEffectiveBid(a) - selectEffectiveBid(b)
                : undefined,
            alignment: Alignment.RIGHT,
          },
          ...expertColumns,
        ]}
        defaultOrder={[
          [2, OrderDirection.DESC],
          [4, OrderDirection.DESC],
        ]}
      />
    </div>
  )
}

function compareBondCommissions(
  { bond: aBond }: ValidatorWithBond,
  { bond: bBond }: ValidatorWithBond,
): number | undefined {
  const aVal = aBond?.inflation_commission_bps
  const bVal = bBond?.inflation_commission_bps
  if (aVal == null && bVal == null) return 0
  if (aVal == null) return Infinity
  if (bVal == null) return -Infinity
  return aVal - bVal
}

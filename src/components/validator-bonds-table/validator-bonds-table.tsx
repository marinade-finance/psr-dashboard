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

import { tooltipAttributes } from '../../services/utils'
import { Metric } from '../metric/metric'
import {
  Alignment,
  OrderDirection,
  Table,
  TRUNCATED_CELL,
} from '../table/table'

import type { ValidatorWithBond } from 'src/services/validator-with-bond'

type Props = {
  data: ValidatorWithBond[]
  level: UserLevel
}

const MIN_TILE = 32
const MAX_TILE = 120

function coverageClass(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'bg-muted/50 border-border'
  if (ratio >= 0.9) return 'bg-green-500/20 border-green-500'
  if (ratio >= 0.5) return 'bg-yellow-500/20 border-yellow-500'
  return 'bg-red-500/20 border-red-500'
}

function coverageBarColor(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'bg-muted-foreground/30'
  if (ratio >= 0.9) return 'bg-green-500'
  if (ratio >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

const ValidatorBondsTileMap: React.FC<{ data: ValidatorWithBond[] }> = ({
  data,
}) => {
  const active = data.filter(e => selectTotalMarinadeStake(e.validator) > 0)
  const maxStake = Math.max(
    ...active.map(e => selectTotalMarinadeStake(e.validator)),
  )

  return (
    <div className="px-4 pb-4">
      <div className="flex flex-wrap gap-1 p-4 bg-card rounded-xl border border-border shadow-card">
        {active.map(entry => {
          const stake = selectTotalMarinadeStake(entry.validator)
          const protectedStake = selectProtectedStake(entry)
          const hasBond = entry.bond !== null
          const ratio = stake > 0 ? protectedStake / stake : 0
          const norm = Math.sqrt(stake / maxStake)
          const size = Math.round(MIN_TILE + norm * (MAX_TILE - MIN_TILE))
          const name = selectName(entry.validator)
          const showText = size >= 48

          return (
            <div
              key={selectVoteAccount(entry.validator)}
              className={`relative flex flex-col justify-between border rounded overflow-hidden shrink-0 ${coverageClass(ratio, hasBond)}`}
              style={{ width: size, height: size }}
              {...tooltipAttributes(
                `${name}<br/>Stake: ${formatSolAmount(stake)} SOL<br/>` +
                  `Coverage: ${formatPercentage(ratio)}`,
              )}
            >
              {showText && (
                <div className="flex-1 px-1 pt-1 overflow-hidden">
                  <div className="text-[10px] font-medium leading-tight truncate">
                    {name}
                  </div>
                  {size >= 64 && (
                    <div className="text-[9px] text-muted-foreground truncate">
                      {formatSolAmount(stake)}
                    </div>
                  )}
                </div>
              )}
              <div className="h-1 w-full bg-muted/30 shrink-0">
                <div
                  className={`h-full ${coverageBarColor(ratio, hasBond)}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
      <Metric
        label="Max Protectable Stake"
        value={formatPercentage(totalMaxProtectedStake / totalMarinadeStake)}
        {...tooltipAttributes(
          "How much of Marinade's stake can be potentially protected if all bonds in the system are used",
        )}
      />
    )
    expertColumns = [
      {
        header: 'Max protected stake [SOL]',
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
      <div className="metricWrap grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-4">
        <Metric
          label="Bonds Funded"
          value={totalFundedBonds.toLocaleString()}
          {...tooltipAttributes('Count of currently funded bonds')}
        />
        <Metric
          label="Bonds Balance"
          value={`${formatSolAmount(effectiveBalance)} SOL`}
          {...tooltipAttributes(
            'Total effective amount of SOL deposited to the bonds',
          )}
        />
        <Metric
          label="Marinade Stake"
          value={`${formatSolAmount(totalMarinadeStake)} SOL`}
          {...tooltipAttributes('How much stake is distributed by Marinade')}
        />
        <Metric
          label="Protected Stake"
          value={`${formatSolAmount(totalProtectedStake)} SOL`}
          {...tooltipAttributes(
            "How much of Marinade's stake is protected by validators' deposits to the bonds",
          )}
        />
        <Metric
          label="Coverage Ratio"
          value={formatPercentage(totalProtectedStake / totalMarinadeStake)}
          {...tooltipAttributes(
            'Total protected stake as a percentage of total Marinade stake across all validators',
          )}
        />
        {expertMetrics}
      </div>
      <ValidatorBondsTileMap data={data} />
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table
            className="[&_tbody]:bg-card [&_tbody_tr]:bg-card [&_tbody_tr:hover]:bg-secondary"
            data={data}
            columns={[
              {
                header: 'Validator',
                headerAttrsFn: () =>
                  tooltipAttributes('Validator Vote Account'),
                render: ({ validator }) => (
                  <span className={TRUNCATED_CELL}>
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
                  <span className={TRUNCATED_CELL}>
                    {selectName(validator)}
                  </span>
                ),
                compare: (a, b) =>
                  selectName(a.validator).localeCompare(
                    selectName(b.validator),
                  ),
              },
              {
                header: 'Bond balance [SOL]',
                render: ({ bond }) => (
                  <>
                    {formatSolAmount(
                      Number(
                        lamportsToSol(
                          bond?.effective_amount?.toString() ?? '0',
                        ),
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
                header: 'Max Stake Wanted [SOL]',
                headerAttrsFn: () =>
                  tooltipAttributes(
                    "The max-stake-wanted parameter set up in contract. If not set up, max stake is not limited. The validator won't get more stake than what they set up here. No already delegated stake will be lost by decreasing this setting.",
                  ),
                render: ({ bond }) => {
                  const maxStakeWanted = bond ? selectMaxStakeWanted(bond) : 0
                  return (
                    <>
                      {maxStakeWanted > 0
                        ? formatSolAmount(maxStakeWanted)
                        : '-'}
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
                headerAttrsFn: () =>
                  tooltipAttributes(
                    'Current commission settings in the bond configuration. If the configured commission is lower ' +
                      'than the on-chain commission, the difference is drawn from the funded bond.<br/>' +
                      'Ordered by in-bond inflation commission.',
                  ),
                cellAttrsFn: ({ bond }) =>
                  tooltipAttributes(
                    `Inflation commission: ${formatBps(bond?.inflation_commission_bps)}<br/>` +
                      `MEV commission: ${formatBps(bond?.mev_commission_bps)}<br/>` +
                      `Block rewards commission: ${formatBps(bond?.block_commission_bps)}`,
                  ),
                render: ({ bond }) => (
                  <>
                    {formatBps(bond?.inflation_commission_bps)} /{' '}
                    {formatBps(bond?.mev_commission_bps)} /{' '}
                    {formatBps(bond?.block_commission_bps)}{' '}
                  </>
                ),
                compare: compareBondCommissions,
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Marinade stake [SOL]',
                render: ({ validator }) => (
                  <span
                    {...tooltipAttributes(
                      `Native: ${formatSolAmount(selectNativeMarinadeStake(validator))}, Liquid: ${formatSolAmount(selectLiquidMarinadeStake(validator))}`,
                    )}
                  >
                    {formatSolAmount(selectTotalMarinadeStake(validator))}
                  </span>
                ),
                compare: (a, b) =>
                  selectTotalMarinadeStake(a.validator) -
                  selectTotalMarinadeStake(b.validator),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Eff. Cost [SOL]',
                headerAttrsFn: () =>
                  tooltipAttributes(
                    'Estimated total cost per epoch for the SAM stake that this validator received. ' +
                      'This estimation does not consider the commission bidding never claims more than the real rewards earned in the epoch. ' +
                      'And the potential penalties for rapid bid changes. (sorts by Eff. Bid)',
                  ),
                cellAttrsFn: () =>
                  tooltipAttributes(
                    'Assumed cost per epoch for the SAM stake that this validator received.',
                  ),
                render: ({ auction }) => (
                  <>{auction ? round(selectEffectiveCost(auction), 1) : '-'}</>
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
      </div>
    </div>
  )
}

function compareBondCommissions(
  { bond: aBond }: ValidatorWithBond,
  { bond: bBond }: ValidatorWithBond,
): number | undefined {
  const aVal = aBond?.inflation_commission_bps
  const bVal = bBond?.inflation_commission_bps
  // Both null/undefined - equal
  if (aVal == null && bVal == null) return 0
  // Only a is null - always push to end (use Infinity so it stays at end regardless of sort direction)
  if (aVal == null) return Infinity
  // Only b is null - always push to end (use -Infinity so it stays at end regardless of sort direction)
  if (bVal == null) return -Infinity
  // Both have values - normal numeric sort
  return aVal - bVal
}

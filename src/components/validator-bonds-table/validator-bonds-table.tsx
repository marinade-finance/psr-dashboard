import React from 'react'

import { UserLevel } from 'src/components/navigation/navigation'
import { formatPercentage, formatSolAmount, lamportsToSol } from 'src/format'
import { selectEffectiveAmount } from 'src/services/bonds'
import {
  selectProtectedStake,
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
import { Alignment, OrderDirection, Table } from '../table/table'

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

function rowCoverageBarColor(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'bg-muted-foreground/30'
  if (ratio >= 0.9) return 'bg-green-500'
  if (ratio >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
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

  const coveredPct =
    totalMarinadeStake > 0
      ? Math.round((totalProtectedStake / totalMarinadeStake) * 100)
      : 0

  const expertColumns: {
    header: string
    render: (entry: ValidatorWithBond) => JSX.Element
    compare: (a: ValidatorWithBond, b: ValidatorWithBond) => number
    alignment: Alignment
  }[] =
    level === UserLevel.Expert
      ? [
          {
            header: 'Max protectable [SOL]',
            render: (entry: ValidatorWithBond) => (
              <>{formatSolAmount(selectMaxProtectedStake(entry))}</>
            ),
            compare: (a: ValidatorWithBond, b: ValidatorWithBond) =>
              selectMaxProtectedStake(a) - selectMaxProtectedStake(b),
            alignment: Alignment.RIGHT,
          },
        ]
      : []

  return (
    <div className="relative">
      {/* Coverage Hero Bar */}
      <div className="px-4 pb-4">
        <div className="metricWrap bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="metric text-3xl font-bold font-mono text-primary">
              {coveredPct}%
            </span>
            <span className="text-sm text-muted-foreground">
              of Marinade stake is bond-protected
            </span>
          </div>
          {/* Stacked bar */}
          <div
            className="h-8 rounded-lg overflow-hidden flex mb-4"
            {...tooltipAttributes(
              `Protected: ${formatSolAmount(totalProtectedStake)} SOL<br/>` +
                `Uncovered: ${formatSolAmount(totalMarinadeStake - totalProtectedStake)} SOL`,
            )}
          >
            <div
              className="flex items-center justify-center text-xs font-medium text-white shrink-0"
              style={{ width: `${coveredPct}%`, background: 'var(--primary)' }}
            >
              {coveredPct > 15
                ? `${formatSolAmount(totalProtectedStake)} SOL covered`
                : ''}
            </div>
            <div
              className="flex items-center justify-center text-xs font-medium text-muted-foreground flex-1 min-w-0"
              style={{ background: 'var(--muted)' }}
            >
              {100 - coveredPct > 15
                ? `${formatSolAmount(totalMarinadeStake - totalProtectedStake)} SOL uncovered`
                : ''}
            </div>
          </div>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span
              className="text-muted-foreground"
              {...tooltipAttributes('Count of currently funded bonds')}
            >
              Bonds funded:{' '}
              <strong className="text-foreground">{totalFundedBonds}</strong>
            </span>
            <span
              className="text-muted-foreground"
              {...tooltipAttributes(
                'Total effective amount of SOL deposited to bonds',
              )}
            >
              Total bonds:{' '}
              <strong className="text-foreground">
                {formatSolAmount(effectiveBalance)} SOL
              </strong>
            </span>
            <span
              className="text-muted-foreground"
              {...tooltipAttributes('Total stake distributed by Marinade')}
            >
              Total stake:{' '}
              <strong className="text-foreground">
                {formatSolAmount(totalMarinadeStake)} SOL
              </strong>
            </span>
            {level === UserLevel.Expert && (
              <span
                className="text-muted-foreground"
                {...tooltipAttributes(
                  "How much of Marinade's stake can be potentially protected if all bonds are used optimally",
                )}
              >
                Max protectable:{' '}
                <strong className="text-foreground">
                  {formatPercentage(
                    totalMaxProtectedStake / totalMarinadeStake,
                  )}
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <ValidatorBondsTileMap data={data} />

      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table
            className="[&_tbody]:bg-card [&_tbody_tr]:bg-card [&_tbody_tr:hover]:bg-secondary"
            showRowNumber
            data={data}
            columns={[
              {
                header: 'Validator',
                render: ({ validator }) => {
                  const name = selectName(validator)
                  const va = selectVoteAccount(validator)
                  return (
                    <div>
                      <div className="font-medium text-[13px] text-foreground">
                        {name || '---'}
                      </div>
                      <div className="text-[11px] font-mono text-secondary-foreground mt-px">
                        {va.slice(0, 8)}...{va.slice(-4)}
                      </div>
                    </div>
                  )
                },
                compare: (a, b) =>
                  selectName(a.validator).localeCompare(
                    selectName(b.validator),
                  ),
              },
              {
                header: 'Marinade Stake [SOL]',
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
                header: 'Bond Balance [SOL]',
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
                header: 'Protected Stake [SOL]',
                render: entry => (
                  <>{formatSolAmount(selectProtectedStake(entry))}</>
                ),
                compare: (a, b) =>
                  selectProtectedStake(a) - selectProtectedStake(b),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Coverage',
                headerAttrsFn: () =>
                  tooltipAttributes(
                    'Ratio of protected stake to total Marinade stake for this validator',
                  ),
                render: entry => {
                  const stake = selectTotalMarinadeStake(entry.validator)
                  const coveredStake = selectProtectedStake(entry)
                  const hasBond = entry.bond !== null
                  const ratio = stake > 0 ? coveredStake / stake : 0
                  return (
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rowCoverageBarColor(ratio, hasBond)}`}
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right">
                        {formatPercentage(ratio)}
                      </span>
                    </div>
                  )
                },
                compare: (a, b) => {
                  const stakeA = selectTotalMarinadeStake(a.validator)
                  const stakeB = selectTotalMarinadeStake(b.validator)
                  const ratioA =
                    stakeA > 0 ? selectProtectedStake(a) / stakeA : 0
                  const ratioB =
                    stakeB > 0 ? selectProtectedStake(b) / stakeB : 0
                  return ratioA - ratioB
                },
                alignment: Alignment.RIGHT,
              },
              ...expertColumns,
            ]}
            defaultOrder={[[1, OrderDirection.DESC]]}
          />
        </div>
      </div>
    </div>
  )
}

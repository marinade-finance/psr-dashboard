import React, { useMemo } from 'react'

import { cn } from 'src/class_utils'
import { docsPath } from 'src/components/breakdowns/docs-path'
import type { UserLevel } from 'src/components/navigation/navigation'
import { HtmlTooltip } from 'src/components/ui/tooltip'
import { ValidatorIdentity } from 'src/components/validator-identity/validator-identity'
import { pct, sol, lamportsToSol } from 'src/format'
import { selectEffectiveAmount } from 'src/services/bonds'
import { notificationTooltip } from 'src/services/notifications'
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

import { BellIcon } from '../icons/bell-icon'
import { TABLE_SHELL_HOVER, Table, TableShell } from '../table/table'
import type { Alignment } from '../table/table'

import type { NotificationSummary } from 'src/services/notifications'
import type { ValidatorWithBond } from 'src/services/validator-with-bond'

type Props = {
  data: ValidatorWithBond[]
  level?: UserLevel
  notificationsMap?: Record<string, NotificationSummary>
}

function rowCoverageBarColor(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'bg-muted-foreground/30'
  if (ratio >= 0.9) return 'bg-status-green'
  if (ratio >= 0.5) return 'bg-warning'
  return 'bg-destructive'
}

export const ValidatorBondsTable: React.FC<Props> = ({
  data,
  level,
  notificationsMap,
}) => {
  const aggregates = useMemo(() => {
    let totalMarinadeStake = 0
    let totalProtectedStake = 0
    let totalMaxProtectedStake = 0
    let effectiveBalance = 0
    let totalFundedBonds = 0
    for (const entry of data) {
      const { validator, bond } = entry
      totalMarinadeStake += selectTotalMarinadeStake(validator)
      totalProtectedStake += selectProtectedStake(entry)
      totalMaxProtectedStake += selectMaxProtectedStake(entry)
      const bondAmount = bond ? selectEffectiveAmount(bond) : 0
      effectiveBalance += bondAmount
      if (bondAmount > 0) totalFundedBonds += 1
    }
    return {
      totalMarinadeStake,
      totalProtectedStake,
      totalMaxProtectedStake,
      effectiveBalance,
      totalFundedBonds,
    }
  }, [data])
  const {
    totalMarinadeStake,
    totalProtectedStake,
    totalMaxProtectedStake,
    effectiveBalance,
    totalFundedBonds,
  } = aggregates

  const coveredRatio =
    totalMarinadeStake > 0 ? totalProtectedStake / totalMarinadeStake : 0
  // Integer-by-construction, used only for CSS width math and threshold checks.
  const coveredPct = Math.round(coveredRatio * 100)

  const expertColumns: {
    header: string
    headerHelp?: string
    headerGuideTo?: string
    render: (entry: ValidatorWithBond) => React.ReactElement
    compare: (a: ValidatorWithBond, b: ValidatorWithBond) => number
    alignment: Alignment
  }[] = useMemo(
    () =>
      level === 'expert'
        ? [
            {
              header: 'Max protectable [SOL]',
              headerHelp:
                'The most stake this bond could ever reimburse if it were stretched to its limit. A bigger bond pushes this number up.',
              headerGuideTo: `${docsPath(level)}#bond`,
              render: (entry: ValidatorWithBond) => (
                <>{sol(selectMaxProtectedStake(entry))}</>
              ),
              compare: (a: ValidatorWithBond, b: ValidatorWithBond) =>
                selectMaxProtectedStake(a) - selectMaxProtectedStake(b),
              alignment: 'right',
            },
          ]
        : [],
    [level],
  )

  return (
    <div className="max-w-[1920px] mx-auto relative">
      {/* Coverage Hero Bar */}
      <div className="px-4 pb-4">
        <div className="metricWrap bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-primary">
              {pct(coveredRatio, 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              of Marinade stake is bond-protected
            </span>
          </div>
          {/* Stacked bar */}
          <HtmlTooltip
            html={
              `Protected: ${sol(totalProtectedStake)} SOL<br/>` +
              `Uncovered: ${sol(totalMarinadeStake - totalProtectedStake)} SOL`
            }
          >
            <div className="h-8 rounded-lg overflow-hidden flex mb-4 w-full">
              <div
                className="flex items-center justify-center text-xs font-medium text-white overflow-hidden"
                style={{
                  width: `${coveredPct}%`,
                  background: 'var(--primary)',
                  flexShrink: 0,
                  flexBasis: `${coveredPct}%`,
                  maxWidth: `${coveredPct}%`,
                }}
              >
                <span className="truncate px-1 hidden sm:block">
                  {coveredPct > 25
                    ? `${sol(totalProtectedStake)} SOL covered`
                    : ''}
                </span>
              </div>
              <div
                className="flex items-center justify-center text-xs font-medium text-muted-foreground overflow-hidden flex-1 min-w-0"
                style={{ background: 'var(--muted)' }}
              >
                <span className="truncate px-1 hidden sm:block">
                  {100 - coveredPct > 25
                    ? `${sol(totalMarinadeStake - totalProtectedStake)} SOL uncovered`
                    : ''}
                </span>
              </div>
            </div>
          </HtmlTooltip>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-4 text-sm">
            <HtmlTooltip html="How many validators have at least some SOL in their bond right now.">
              <span className="text-muted-foreground">
                Bonds funded:{' '}
                <strong className="text-foreground">{totalFundedBonds}</strong>
              </span>
            </HtmlTooltip>
            <HtmlTooltip html="Total SOL sitting in all validator bonds combined.">
              <span className="text-muted-foreground">
                Total bonds:{' '}
                <strong className="text-foreground">
                  {sol(effectiveBalance)} SOL
                </strong>
              </span>
            </HtmlTooltip>
            <HtmlTooltip html="Total SOL Marinade has staked across all validators.">
              <span className="text-muted-foreground">
                Total stake:{' '}
                <strong className="text-foreground">
                  {sol(totalMarinadeStake)} SOL
                </strong>
              </span>
            </HtmlTooltip>
            {level === 'expert' && (
              <HtmlTooltip html="If every bond stretched as far as it could, this is the share of Marinade's stake that would be covered.">
                <span className="text-muted-foreground">
                  Max protectable:{' '}
                  <strong className="text-foreground">
                    {pct(
                      totalMarinadeStake > 0
                        ? totalMaxProtectedStake / totalMarinadeStake
                        : 0,
                    )}
                  </strong>
                </span>
              </HtmlTooltip>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <TableShell>
          <Table
            className={TABLE_SHELL_HOVER}
            showRowNumber
            data={data}
            columns={[
              {
                header: 'Validator',
                render: ({ validator }) => {
                  const name = selectName(validator)
                  const va = selectVoteAccount(validator)
                  const summary = notificationsMap?.[va]
                  return (
                    <ValidatorIdentity
                      name={name}
                      voteAccount={va}
                      trailing={
                        summary && (
                          <HtmlTooltip html={notificationTooltip(summary)}>
                            <button
                              type="button"
                              className="shrink-0 text-warning opacity-80 hover:opacity-100 w-4 h-4"
                              aria-label={`${summary.count} notification${summary.count === 1 ? '' : 's'}`}
                            >
                              {BellIcon}
                            </button>
                          </HtmlTooltip>
                        )
                      }
                    />
                  )
                },
                compare: (a, b) =>
                  selectName(a.validator).localeCompare(
                    selectName(b.validator),
                  ),
              },
              {
                header: 'Marinade Stake [SOL]',
                headerHelp:
                  'All the SOL Marinade has staked with this validator — both directly staked SOL and SOL backing mSOL.',
                headerGuideTo: `${docsPath(level)}#bond`,
                render: ({ validator }) => (
                  <HtmlTooltip
                    html={`Native: ${sol(selectNativeMarinadeStake(validator))}, Liquid: ${sol(selectLiquidMarinadeStake(validator))}`}
                  >
                    <span>{sol(selectTotalMarinadeStake(validator))}</span>
                  </HtmlTooltip>
                ),
                compare: (a, b) =>
                  selectTotalMarinadeStake(a.validator) -
                  selectTotalMarinadeStake(b.validator),
                alignment: 'right',
              },
              {
                header: 'Bond Balance [SOL]',
                headerHelp:
                  'How much SOL the validator has in its safety deposit, ready to reimburse stakers if something goes wrong.',
                headerGuideTo: `${docsPath(level)}#bond`,
                render: ({ bond }) => (
                  <>
                    {sol(
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
                alignment: 'right',
              },
              {
                header: 'Protected Stake [SOL]',
                headerHelp:
                  "The slice of this validator's Marinade stake that the bond is big enough to reimburse if needed.",
                headerGuideTo: `${docsPath(level)}#bond`,
                render: entry => <>{sol(selectProtectedStake(entry))}</>,
                compare: (a, b) =>
                  selectProtectedStake(a) - selectProtectedStake(b),
                alignment: 'right',
              },
              {
                header: 'Coverage',
                headerHelp:
                  "What share of this validator's Marinade stake the bond can fully cover. 100% means everything is protected.",
                headerGuideTo: `${docsPath(level)}#bond`,
                render: entry => {
                  const stake = selectTotalMarinadeStake(entry.validator)
                  const coveredStake = selectProtectedStake(entry)
                  const hasBond = entry.bond !== null
                  const ratio = stake > 0 ? coveredStake / stake : 0
                  return (
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            rowCoverageBarColor(ratio, hasBond),
                          )}
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right">
                        {pct(ratio)}
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
                alignment: 'right',
              },
              ...expertColumns,
            ]}
            defaultOrder={[[1, 'desc']]}
          />
        </TableShell>
      </div>
    </div>
  )
}

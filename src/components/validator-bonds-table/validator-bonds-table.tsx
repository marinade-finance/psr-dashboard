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

const MIN_TILE = 28
const MAX_TILE = 120

const TIER_LARGE = 100_000
const TIER_HIGH = 50_000
const TIER_MID = 20_000

function coverageColor(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'hsl(220, 8%, 28%)'
  if (ratio >= 0.95) return 'hsl(168, 55%, 32%)'
  if (ratio >= 0.7) return 'hsl(172, 45%, 28%)'
  if (ratio >= 0.4) return 'hsl(38, 65%, 30%)'
  return 'hsl(0, 50%, 30%)'
}

function coverageBarFill(ratio: number, hasBond: boolean): string {
  if (!hasBond) return 'rgba(120,130,150,0.50)'
  if (ratio >= 0.95) return 'hsl(168, 60%, 48%)'
  if (ratio >= 0.7) return 'hsl(172, 52%, 42%)'
  if (ratio >= 0.4) return 'hsl(38, 72%, 50%)'
  return 'hsl(0, 58%, 48%)'
}

type TierRow = {
  label: string
  entries: ValidatorWithBond[]
}

function buildTierRows(active: ValidatorWithBond[]): TierRow[] {
  const s = (e: ValidatorWithBond) => selectTotalMarinadeStake(e.validator)
  return [
    { label: '>100k', entries: active.filter(e => s(e) >= TIER_LARGE) },
    {
      label: '50k–100k',
      entries: active.filter(e => s(e) >= TIER_HIGH && s(e) < TIER_LARGE),
    },
    {
      label: '20k–50k',
      entries: active.filter(e => s(e) >= TIER_MID && s(e) < TIER_HIGH),
    },
    { label: '<20k', entries: active.filter(e => s(e) < TIER_MID) },
  ].filter(r => r.entries.length > 0)
}

const ValidatorBondsTileMap: React.FC<{ data: ValidatorWithBond[] }> = ({
  data,
}) => {
  const active = data
    .filter(e => selectTotalMarinadeStake(e.validator) > 0)
    .sort(
      (a, b) =>
        selectTotalMarinadeStake(b.validator) -
        selectTotalMarinadeStake(a.validator),
    )

  const globalMaxStake =
    active.length > 0 ? selectTotalMarinadeStake(active[0].validator) : 1

  const tiers = buildTierRows(active)

  return (
    <div className="px-4 pb-4">
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {tiers.map((tier, i) => {
          return (
            <div
              key={tier.label}
              className={`flex items-stretch${i > 0 ? ' border-t border-border/40' : ''}`}
            >
              {/* Stake tier label */}
              <div
                className="flex items-center justify-center shrink-0 text-[10px] text-muted-foreground font-mono"
                style={{ width: 56, minHeight: 40 }}
              >
                {tier.label}
              </div>
              {/* Tiles */}
              <div className="flex flex-wrap gap-px p-2 flex-1 min-w-0">
                {tier.entries.map(entry => {
                  const stake = selectTotalMarinadeStake(entry.validator)
                  const protectedStake = selectProtectedStake(entry)
                  const ratio = stake > 0 ? protectedStake / stake : 0
                  const hasBond = entry.bond !== null
                  const norm = Math.sqrt(stake / globalMaxStake)
                  const size = Math.round(
                    MIN_TILE + norm * (MAX_TILE - MIN_TILE),
                  )
                  const name = selectName(entry.validator)
                  const coveragePct = Math.min(Math.round(ratio * 100), 100)
                  const tileBg = coverageColor(ratio, hasBond)
                  const barFill = coverageBarFill(ratio, hasBond)

                  return (
                    <div
                      key={selectVoteAccount(entry.validator)}
                      className="relative flex flex-col rounded-lg overflow-hidden shrink-0 cursor-default"
                      style={{
                        width: size,
                        height: size,
                        background: tileBg,
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.25)',
                      }}
                      {...tooltipAttributes(
                        `${name}<br/>` +
                          `Stake: ${formatSolAmount(stake)} SOL<br/>` +
                          `Coverage: ${formatPercentage(ratio)}` +
                          (!hasBond ? '<br/>No bond' : ''),
                      )}
                    >
                      {size >= 36 && (
                        <div className="flex-1 px-1.5 pt-1 overflow-hidden">
                          <div
                            className="text-[10px] font-bold leading-tight truncate"
                            style={{
                              color: 'rgba(255,255,255,0.95)',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            }}
                          >
                            {name}
                          </div>
                          {size >= 56 && (
                            <div
                              className="text-[9px] leading-tight truncate mt-0.5 font-medium"
                              style={{
                                color: 'rgba(255,255,255,0.72)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                              }}
                            >
                              {formatSolAmount(stake)} SOL
                            </div>
                          )}
                          {size >= 76 && (
                            <div
                              className="text-[9px] leading-tight truncate mt-0.5 font-medium"
                              style={{
                                color: 'rgba(255,255,255,0.65)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                              }}
                            >
                              {coveragePct}% cov.
                            </div>
                          )}
                        </div>
                      )}
                      {/* Coverage bar — always at bottom via mt-auto */}
                      <div
                        className="mt-auto shrink-0 w-full"
                        style={{ height: 7, background: 'rgba(0,0,0,0.35)' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${coveragePct}%`,
                            background: barFill,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1"
        style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: 'hsl(220, 8%, 28%)' }}
          />
          <span>No bond</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: 'hsl(0, 50%, 30%)' }}
          />
          <span>&lt;40% covered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: 'hsl(38, 65%, 30%)' }}
          />
          <span>40–70%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: 'hsl(172, 45%, 28%)' }}
          />
          <span>70–95%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: 'hsl(168, 55%, 32%)' }}
          />
          <span>≥95% covered</span>
        </div>
        <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Tile size ∝ √stake (per tier)
        </span>
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
    headerHelp?: string
    render: (entry: ValidatorWithBond) => JSX.Element
    compare: (a: ValidatorWithBond, b: ValidatorWithBond) => number
    alignment: Alignment
  }[] =
    level === UserLevel.Expert
      ? [
          {
            header: 'Max protectable [SOL]',
            headerHelp:
              'Maximum Marinade stake that could be protected if the bond is used optimally. Higher bond balances raise this ceiling.',
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
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto">
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
                headerHelp:
                  'Total SOL delegated by Marinade to this validator — native stake plus liquid staking stake combined.',
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
                headerHelp:
                  "Effective SOL deposited in this validator's on-chain bond account, available to cover potential protected events.",
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
                headerHelp:
                  "How much of this validator's Marinade stake is currently covered by the bond — stakers on this portion are protected.",
                render: entry => (
                  <>{formatSolAmount(selectProtectedStake(entry))}</>
                ),
                compare: (a, b) =>
                  selectProtectedStake(a) - selectProtectedStake(b),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Coverage',
                headerHelp:
                  'Ratio of protected stake to total Marinade stake for this validator. 100% means the bond fully covers all delegated stake.',
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

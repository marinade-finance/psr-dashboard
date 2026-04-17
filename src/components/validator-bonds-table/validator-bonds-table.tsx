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

/**
 * Map bid pmpe + coverage ratio to an HSL tile background color.
 * When bid=0, coverage ratio nudges the hue toward teal so covered
 * validators are visually distinct from uncovered ones.
 */
function tileColor(bid: number, coverage: number): string {
  if (bid < 1) {
    // No bid: grey-blue for 0% coverage → subtle teal hint at 100% coverage
    const t = Math.min(coverage, 1)
    const h = Math.round(220 + t * (185 - 220))
    const s = Math.round(14 + t * (22 - 14))
    const l = Math.round(20 + t * (24 - 20))
    return `hsl(${h},${s}%,${l}%)`
  }
  if (bid < 50) {
    const t = bid / 50
    const h = Math.round(220 + t * (174 - 220))
    const s = Math.round(14 + t * (62 - 14))
    const l = Math.round(22 + t * (30 - 22))
    return `hsl(${h},${s}%,${l}%)`
  }
  if (bid < 150) {
    const t = (bid - 50) / 100
    const h = Math.round(174 + t * (172 - 174))
    const s = Math.round(62 + t * (52 - 62))
    const l = Math.round(30 + t * (28 - 30))
    return `hsl(${h},${s}%,${l}%)`
  }
  if (bid < 300) {
    const t = (bid - 150) / 150
    const h = Math.round(172 + t * (142 - 172))
    const s = Math.round(52 + t * (65 - 52))
    const l = Math.round(28 + t * (26 - 28))
    return `hsl(${h},${s}%,${l}%)`
  }
  const t = Math.min((bid - 300) / 200, 1)
  const h = Math.round(142 + t * (130 - 142))
  const s = Math.round(65 + t * (55 - 65))
  const l = Math.round(26 + t * (32 - 26))
  return `hsl(${h},${s}%,${l}%)`
}

/** Legend swatch color (bid only, no coverage). */
function bidHeatColor(bid: number): string {
  return tileColor(bid, 1)
}

/** Coverage bar accent color — teal matching page primary. */
function coverageBarColor(bid: number): string {
  if (bid < 1) return 'rgba(27,154,139,0.80)'
  if (bid < 150) return 'rgba(20,184,166,0.88)'
  if (bid < 300) return 'rgba(27,154,139,0.92)'
  return 'rgba(22,163,74,0.92)'
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
  const maxStake =
    active.length > 0 ? selectTotalMarinadeStake(active[0].validator) : 1

  return (
    <div className="px-4 pb-4">
      <div className="flex flex-wrap gap-px p-3 bg-card rounded-xl border border-border shadow-card">
        {active.map(entry => {
          const stake = selectTotalMarinadeStake(entry.validator)
          const protectedStake = selectProtectedStake(entry)
          const ratio = stake > 0 ? protectedStake / stake : 0
          const bid = entry.auction?.revShare.bidPmpe ?? 0
          const norm = Math.sqrt(stake / maxStake)
          const size = Math.round(MIN_TILE + norm * (MAX_TILE - MIN_TILE))
          const name = selectName(entry.validator)
          const showText = size >= 56
          const tileBg = tileColor(bid, ratio)
          const barColor = coverageBarColor(bid)
          const coveragePct = Math.min(Math.round(ratio * 100), 100)
          const barH = size >= 72 ? 4 : 3

          return (
            <div
              key={selectVoteAccount(entry.validator)}
              className="relative flex flex-col justify-between rounded-lg overflow-hidden shrink-0 cursor-default"
              style={{
                width: size,
                height: size,
                background: tileBg,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.30)',
              }}
              {...tooltipAttributes(
                `${name}<br/>` +
                  `Stake: ${formatSolAmount(stake)} SOL<br/>` +
                  `Bid: ${bid >= 1 ? `${Math.round(bid)} pmpe` : 'none'}<br/>` +
                  `Coverage: ${formatPercentage(ratio)}`,
              )}
            >
              {showText && (
                <div className="flex-1 px-1.5 pt-1.5 overflow-hidden">
                  <div
                    className="text-[10px] font-semibold leading-tight truncate"
                    style={{ color: 'rgba(255,255,255,0.88)' }}
                  >
                    {name}
                  </div>
                  {size >= 72 && (
                    <div
                      className="text-[9px] leading-tight truncate mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.42)' }}
                    >
                      {formatSolAmount(stake)} SOL
                    </div>
                  )}
                  {size >= 90 && (
                    <div
                      className="text-[9px] leading-tight truncate mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.42)' }}
                    >
                      {bid >= 1
                        ? `${Math.round(bid)} pmpe`
                        : `${coveragePct}% cov.`}
                    </div>
                  )}
                </div>
              )}
              {/* Coverage bar — width proportional to protected/total stake */}
              <div
                className="shrink-0 w-full"
                style={{ height: barH, background: 'rgba(0,0,0,0.35)' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${coveragePct}%`,
                    background: barColor,
                    transition: 'width 0.3s ease',
                  }}
                />
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
            style={{ width: 10, height: 10, background: bidHeatColor(0) }}
          />
          <span>No bid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: bidHeatColor(100) }}
          />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: bidHeatColor(250) }}
          />
          <span>Mid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-sm shrink-0"
            style={{ width: 10, height: 10, background: bidHeatColor(400) }}
          />
          <span>High bid</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <div
            className="rounded-sm shrink-0 overflow-hidden"
            style={{ width: 22, height: 5, background: 'rgba(0,0,0,0.35)' }}
          >
            <div
              style={{
                width: '60%',
                height: '100%',
                background: 'rgba(27,154,139,0.80)',
              }}
            />
          </div>
          <span>Coverage</span>
        </div>
        <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Tile size ∝ √stake
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

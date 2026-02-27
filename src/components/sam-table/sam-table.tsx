import React, { useMemo, useRef, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table'
import { formatPercentage, formatSolAmount } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'
import {
  selectBondSize,
  selectMaxAPY,
  selectSamDistributedStake,
  selectVoteAccount,
  selectWinningAPY,
  selectProjectedAPY,
} from 'src/services/sam'
import {
  getApyBreakdown,
  getBondHealth,
  getValidatorTip,
  getTipStyle,
  calculateBondUtilization,
  formatStakeDelta,
} from 'src/services/tip-engine'

import type { UserLevel } from '../navigation/navigation'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

type ValidatorWithBondState = AuctionValidator & {
  bondHealth: 'healthy' | 'watch' | 'critical'
}

type Props = {
  auctionResult: AuctionResult
  originalAuctionResult: AuctionResult | null
  epochsPerYear: number
  dsSamConfig: DsSamConfig
  level: UserLevel
  simulatedValidator: string | null
  isCalculating: boolean
  hasSimulationApplied: boolean
  onValidatorClick: (voteAccount: string) => void
  nameMap?: Map<string, string>
}

// ASCII progress bar helper
const asciiBar = (pct: number, width: number = 10): string => {
  const filled = Math.round((Math.min(pct, 100) / 100) * width)
  const empty = width - filled
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']'
}

// APY Tooltip component
const ApyTooltip: React.FC<{
  validator: AuctionValidator
  epochsPerYear: number
}> = ({ validator, epochsPerYear }) => {
  const breakdown = getApyBreakdown(validator, epochsPerYear)
  const inflComm = validator.inflationCommissionDec * 100
  const mevComm =
    validator.mevCommissionDec !== null ? validator.mevCommissionDec * 100 : 0
  const blockComm =
    validator.blockRewardsCommissionDec !== null
      ? validator.blockRewardsCommissionDec * 100
      : 0

  return (
    <div className="absolute top-[-4px] left-[calc(100%-16px)] z-[100] bg-card border border-border px-4 py-3 min-w-[230px]">
      <div className="text-[11px] text-muted-foreground mb-2 font-mono">
        APY Composition
      </div>
      <div className="text-xs mb-1 font-mono">
        <span className="text-muted-foreground">| </span>
        <span className="text-foreground">Inflation</span>
        <span className="text-muted-foreground text-[10px]">
          {' '}
          ({inflComm.toFixed(0)}% comm.)
        </span>
        <span className="text-foreground font-mono float-right">
          {formatPercentage(breakdown.inflation, 2)}
        </span>
      </div>
      <div className="text-xs mb-1 font-mono">
        <span className="text-muted-foreground">| </span>
        <span className="text-foreground">MEV Tips</span>
        <span className="text-muted-foreground text-[10px]">
          {' '}
          ({mevComm.toFixed(0)}% comm.)
        </span>
        <span className="text-foreground font-mono float-right">
          {formatPercentage(breakdown.mev, 2)}
        </span>
      </div>
      <div className="text-xs mb-1 font-mono">
        <span className="text-muted-foreground">| </span>
        <span className="text-foreground">Block Rewards</span>
        <span className="text-muted-foreground text-[10px]">
          {' '}
          ({blockComm.toFixed(0)}% shared)
        </span>
        <span className="text-foreground font-mono float-right">
          {formatPercentage(breakdown.blockRewards, 2)}
        </span>
      </div>
      <div className="text-xs mb-1 font-mono">
        <span className="text-muted-foreground">| </span>
        <span className="text-foreground">Stake Bid</span>
        <span className="text-muted-foreground text-[10px]"> (your bid)</span>
        <span className="text-foreground font-mono float-right">
          {formatPercentage(breakdown.stakeBid, 2)}
        </span>
      </div>
      <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between text-xs font-semibold font-mono">
        <span className="text-foreground">Total</span>
        <span className="text-primary">
          {formatPercentage(breakdown.total, 2)}
        </span>
      </div>
    </div>
  )
}

export const SamTable: React.FC<Props> = ({
  auctionResult,
  originalAuctionResult: _originalAuctionResult,
  epochsPerYear,
  dsSamConfig,
  level: _level,
  simulatedValidator,
  isCalculating,
  hasSimulationApplied: _hasSimulationApplied,
  onValidatorClick,
  nameMap,
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

  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [hoveredApyRow, setHoveredApyRow] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const validatorsWithBond: ValidatorWithBondState[] = useMemo(
    () =>
      validators
        .filter(validator => selectBondSize(validator) > 0)
        .map(v => {
          const bondUtilPct = calculateBondUtilization(v)
          const bondRunway = v.bondGoodForNEpochs ?? 0
          return {
            ...v,
            bondHealth: getBondHealth(bondUtilPct, bondRunway),
          }
        }),
    [validators],
  )

  const sortedValidators = useMemo(() => {
    return [...validatorsWithBond].sort(
      (a, b) =>
        b.auctionStake.marinadeSamTargetSol -
        a.auctionStake.marinadeSamTargetSol,
    )
  }, [validatorsWithBond])

  const winningValidators = sortedValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol > 0,
  )
  const nonWinningValidators = sortedValidators.filter(
    v => v.auctionStake.marinadeSamTargetSol === 0,
  )

  const totalValidators = sortedValidators.length
  const winningCount = winningValidators.length

  const stats: {
    label: string
    value: string
    unit: string
    help: string | undefined
  }[] = [
    {
      label: 'Total Auction Stake',
      value: formatSolAmount(samDistributedStake, 0),
      unit: '\u25CE',
      help: undefined,
    },
    {
      label: 'Winning APY',
      value: formatPercentage(winningAPY, 2),
      unit: '',
      help: HELP_TEXT.winningApy,
    },
    {
      label: 'Projected APY',
      value: formatPercentage(projectedApy, 2),
      unit: '',
      help: undefined,
    },
    {
      label: 'Winning Validators',
      value: `${winningCount} / ${totalValidators}`,
      unit: '',
      help: undefined,
    },
  ]

  const renderRow = (validator: ValidatorWithBondState, index: number) => {
    const voteAccount = selectVoteAccount(validator)
    const rank = index + 1
    const isSimulated = simulatedValidator === voteAccount

    // Bond health
    const bondUtilPct = calculateBondUtilization(validator)
    const bondRunway = validator.bondGoodForNEpochs ?? 0
    const bondHealth = validator.bondHealth
    const hasAlert = bondRunway <= 5 || bondUtilPct >= 85

    // Stake delta
    const delta = formatStakeDelta(validator)

    // Tip
    const tip = getValidatorTip(validator, winningAPY, epochsPerYear)
    const tipStyle = getTipStyle(tip.urgency)

    // Max APY
    const maxApy = selectMaxAPY(validator, epochsPerYear)

    const healthLabel =
      bondHealth === 'critical'
        ? '[CRITICAL]'
        : bondHealth === 'watch'
          ? '[WATCH]'
          : '[HEALTHY]'

    return (
      <TableRow
        key={voteAccount}
        className={`border-b border-border-grid cursor-pointer ${isSimulated ? 'bg-muted' : ''}`}
        onMouseEnter={() => setHoveredRow(voteAccount)}
        onMouseLeave={() => setHoveredRow(null)}
        onClick={() => onValidatorClick(voteAccount)}
      >
        {/* Rank */}
        <TableCell className="px-3.5 py-3 text-center text-muted-foreground font-mono text-xs w-10">
          {rank}
        </TableCell>

        {/* Validator */}
        <TableCell className="px-3.5 py-3 min-w-[180px]">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-[13px] font-mono">
              {nameMap?.get(voteAccount) || `${voteAccount.slice(0, 8)}...`}
            </span>
            {hasAlert && (
              <span className="text-foreground font-mono text-xs">!</span>
            )}
          </div>
          <div className="text-muted-foreground text-[11px] mt-px font-mono">
            {voteAccount.slice(0, 12)}...
          </div>
        </TableCell>

        {/* Max APY */}
        <TableCell
          className="px-3.5 py-3 relative"
          onMouseEnter={e => {
            e.stopPropagation()
            setHoveredApyRow(voteAccount)
          }}
          onMouseLeave={() => setHoveredApyRow(null)}
        >
          <span className="font-mono text-[13px] text-foreground">
            {formatPercentage(maxApy, 2)}
          </span>
          {hoveredApyRow === voteAccount && (
            <ApyTooltip validator={validator} epochsPerYear={epochsPerYear} />
          )}
        </TableCell>

        {/* Bond Health */}
        <TableCell className="px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-1 font-mono text-[11px]">
            <span className="text-foreground">{healthLabel}</span>
            <span className="text-muted-foreground">
              {formatSolAmount(selectBondSize(validator), 0)}
              {'\u25CE'}
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {asciiBar(bondUtilPct)} ~{Math.round(bondRunway)}ep
          </div>
        </TableCell>

        {/* Stake Delta */}
        <TableCell className="px-3.5 py-3">
          <span
            className="font-mono text-[13px]"
            style={{ color: delta.color }}
          >
            {delta.arrow} {delta.text}
            {delta.text !== '\u2014' && ' \u25CE'}
          </span>
        </TableCell>

        {/* Next Step */}
        <TableCell className="px-3.5 py-3 max-w-[350px]">
          <span className="font-mono text-xs text-foreground">
            <span className="text-muted-foreground">{tipStyle.icon} </span>
            {tip.text.replace(/~?\d+\.\d{3,}/g, m => {
              const n = parseFloat(m.replace(/^~/, ''))
              const prefix = m.startsWith('~') ? '~' : ''
              return `${prefix}${Math.round(n * 100) / 100}`
            })}
          </span>
        </TableCell>

        {/* Chevron */}
        <TableCell className="px-2.5 py-3 w-10">
          <span
            className={`font-mono text-sm ${hoveredRow === voteAccount ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {'>'}
          </span>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div
      ref={tableWrapRef}
      className={`w-full ${isCalculating ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-card px-5 py-4 border border-border"
          >
            <div className="text-[11px] text-muted-foreground mb-1 font-mono flex items-center gap-1 uppercase tracking-wider">
              {':: '}
              {stat.label}
              {stat.help && <HelpTip text={stat.help} />}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[22px] font-semibold text-foreground font-mono">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-sm text-muted-foreground font-mono">
                  {stat.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden">
        <ShadTable className="font-mono text-[13px]">
          <TableHeader>
            <TableRow className="border-b border-border-grid">
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-10 text-center">
                #
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted min-w-[150px]">
                Validator
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-[100px]">
                Max APY
                <HelpTip text={HELP_TEXT.maxApy} />
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-40">
                Bond
                <HelpTip text={HELP_TEXT.bondHealth} />
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-[120px]">
                Stake {'\u0394'}
                <HelpTip text={HELP_TEXT.stakeDelta} />
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted min-w-[200px]">
                Next Step
              </TableHead>
              <TableHead className="px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {winningValidators.map((v, i) => renderRow(v, i))}

            {/* Winning Set Cutoff Divider */}
            {nonWinningValidators.length > 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <div className="text-center py-2 border-y-2 border-border font-mono text-xs text-muted-foreground">
                    {'══════════ WINNING SET CUTOFF ══════════'}
                    {'  '}Winning APY: {formatPercentage(winningAPY, 2)}
                    {'  '}({winningCount} of {totalValidators})
                  </div>
                </TableCell>
              </TableRow>
            )}

            {nonWinningValidators.map((v, i) => renderRow(v, winningCount + i))}
          </TableBody>
        </ShadTable>
      </div>
    </div>
  )
}

import React, { useMemo, useRef, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
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

// Pad/truncate string to exact width
const pad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
const rpad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : ' '.repeat(w - s.length) + s

// ASCII progress bar
const asciiBar = (pct: number, width: number = 10): string => {
  const filled = Math.round((Math.min(pct, 100) / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// Column widths
const W = { rank: 4, name: 22, apy: 9, bond: 30, delta: 16, tip: 52 }
const SEP = ' │ '
const TOTAL_W =
  W.rank + W.name + W.apy + W.bond + W.delta + W.tip + SEP.length * 5

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

  const lines = [
    `┌─── APY COMPOSITION ───────────┐`,
    `│ Inflation  (${rpad(inflComm.toFixed(0) + '%', 4)} comm)  ${rpad(formatPercentage(breakdown.inflation, 2), 8)} │`,
    `│ MEV Tips   (${rpad(mevComm.toFixed(0) + '%', 4)} comm)  ${rpad(formatPercentage(breakdown.mev, 2), 8)} │`,
    `│ Block Rwds (${rpad(blockComm.toFixed(0) + '%', 4)} shrd)  ${rpad(formatPercentage(breakdown.blockRewards, 2), 8)} │`,
    `│ Stake Bid  (your bid)  ${rpad(formatPercentage(breakdown.stakeBid, 2), 8)} │`,
    `├───────────────────────────────┤`,
    `│ TOTAL              ${rpad(formatPercentage(breakdown.total, 2), 10)} │`,
    `└───────────────────────────────┘`,
  ]

  return (
    <div
      className="absolute top-0 left-full ml-2 z-[100] whitespace-pre font-mono text-[11px] leading-[1.4] text-foreground"
      style={{ backgroundColor: '#F5E6D3' }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
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

  const _tableWrapRef = useRef<HTMLDivElement>(null)
  const [hoveredApyRow, setHoveredApyRow] = useState<string | null>(null)

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

  // Header separator line
  const headerLine =
    '─'.repeat(W.rank) +
    '─┼─' +
    '─'.repeat(W.name) +
    '─┼─' +
    '─'.repeat(W.apy) +
    '─┼─' +
    '─'.repeat(W.bond) +
    '─┼─' +
    '─'.repeat(W.delta) +
    '─┼─' +
    '─'.repeat(W.tip)

  const renderTerminalRow = (
    validator: ValidatorWithBondState,
    index: number,
  ) => {
    const voteAccount = selectVoteAccount(validator)
    const rank = index + 1
    const bondUtilPct = calculateBondUtilization(validator)
    const bondRunway = validator.bondGoodForNEpochs ?? 0
    const bondHealth = validator.bondHealth
    const delta = formatStakeDelta(validator)
    const tip = getValidatorTip(validator, winningAPY, epochsPerYear)
    const tipStyle = getTipStyle(tip.urgency)
    const maxApy = selectMaxAPY(validator, epochsPerYear)
    const isSimulated = simulatedValidator === voteAccount

    const name =
      nameMap?.get(voteAccount) || `${voteAccount.slice(0, 16)}...`
    const healthTag =
      bondHealth === 'critical'
        ? 'CRIT'
        : bondHealth === 'watch'
          ? 'WARN'
          : ' OK '
    const bondStr = `[${healthTag}] ${rpad(formatSolAmount(selectBondSize(validator), 0) + '◎', 8)} ${asciiBar(bondUtilPct, 8)} ~${Math.round(bondRunway)}ep`
    const deltaStr = `${delta.arrow} ${delta.text}${delta.text !== '—' ? ' ◎' : ''}`
    const tipText = `${tipStyle.icon} ${tip.text.replace(/~?\d+\.\d{3,}/g, m => {
      const n = parseFloat(m.replace(/^~/, ''))
      const prefix = m.startsWith('~') ? '~' : ''
      return `${prefix}${Math.round(n * 100) / 100}`
    })}`

    return (
      <div
        key={voteAccount}
        className={`cursor-pointer hover:opacity-70 ${isSimulated ? 'font-bold' : ''}`}
        onClick={() => onValidatorClick(voteAccount)}
        style={{ position: 'relative' }}
      >
        <span>{pad(String(rank), W.rank)}</span>
        <span className="text-muted-foreground">{SEP}</span>
        <span>{pad(name, W.name)}</span>
        <span className="text-muted-foreground">{SEP}</span>
        <span
          onMouseEnter={() => setHoveredApyRow(voteAccount)}
          onMouseLeave={() => setHoveredApyRow(null)}
          style={{ position: 'relative', display: 'inline' }}
        >
          {rpad(formatPercentage(maxApy, 2), W.apy)}
          {hoveredApyRow === voteAccount && (
            <ApyTooltip
              validator={validator}
              epochsPerYear={epochsPerYear}
            />
          )}
        </span>
        <span className="text-muted-foreground">{SEP}</span>
        <span>{pad(bondStr, W.bond)}</span>
        <span className="text-muted-foreground">{SEP}</span>
        <span>{rpad(deltaStr, W.delta)}</span>
        <span className="text-muted-foreground">{SEP}</span>
        <span className="text-muted-foreground">{pad(tipText, W.tip)}</span>
      </div>
    )
  }

  return (
    <div
      className={`w-full font-mono text-[12px] leading-[1.6] text-foreground ${isCalculating ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Stats */}
      <div className="mb-4 whitespace-pre leading-[1.8]">
        <span className="text-muted-foreground">{':: '}</span>
        TOTAL AUCTION STAKE{' '}
        <span className="font-bold">
          {formatSolAmount(samDistributedStake, 0)}◎
        </span>
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        WINNING APY{' '}
        <span className="font-bold">{formatPercentage(winningAPY, 2)}</span>
        <HelpTip text={HELP_TEXT.winningApy} />
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        PROJECTED APY{' '}
        <span className="font-bold">{formatPercentage(projectedApy, 2)}</span>
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        WINNING{' '}
        <span className="font-bold">
          {winningCount}/{totalValidators}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto whitespace-pre">
        {/* Header */}
        <div className="text-muted-foreground">
          <span>{pad('#', W.rank)}</span>
          <span>{SEP}</span>
          <span>{pad('VALIDATOR', W.name)}</span>
          <span>{SEP}</span>
          <span>{rpad('MAX APY', W.apy)}</span>
          <span>{SEP}</span>
          <span>{pad('BOND', W.bond)}</span>
          <span>{SEP}</span>
          <span>{rpad('STAKE Δ', W.delta)}</span>
          <span>{SEP}</span>
          <span>{pad('NEXT STEP', W.tip)}</span>
        </div>
        <div className="text-muted-foreground">{headerLine}</div>

        {/* Winning validators */}
        {winningValidators.map((v, i) => renderTerminalRow(v, i))}

        {/* Cutoff */}
        {nonWinningValidators.length > 0 && (
          <div className="text-muted-foreground">
            {'═'.repeat(
              W.rank +
                W.name +
                W.apy +
                W.bond +
                W.delta +
                W.tip +
                SEP.length * 5,
            )}
            {'\n'}
            {pad(
              `  ▲ WINNING SET CUTOFF ▲  Winning APY: ${formatPercentage(winningAPY, 2)}  (${winningCount} of ${totalValidators})`,
              TOTAL_W,
            )}
            {'\n'}
            {'═'.repeat(TOTAL_W)}
          </div>
        )}

        {/* Non-winning validators */}
        {nonWinningValidators.map((v, i) =>
          renderTerminalRow(v, winningCount + i),
        )}
      </div>
    </div>
  )
}

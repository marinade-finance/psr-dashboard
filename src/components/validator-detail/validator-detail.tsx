import React, { useMemo, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { formatPercentage, formatSolAmount } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'
import { selectVoteAccount, selectWinningAPY } from 'src/services/sam'
import {
  getApyBreakdown,
  getBondHealth,
  getValidatorTip,
  getTipStyle,
  calculateBondUtilization,
  formatStakeDelta,
} from 'src/services/tip-engine'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

interface ValidatorDetailProps {
  validator: AuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  epochsPerYear: number
  rank: number
  totalValidators: number
  onClose: () => void
  onSimulate: (
    inflationCommission: number | null,
    mevCommission: number | null,
    blockRewardsCommission: number | null,
    bidPmpe: number | null,
  ) => void
  isCalculating: boolean
}

// Dot-leader between label and value
const dotLine = (label: string, value: string, width: number = 40): string => {
  const dots = Math.max(2, width - label.length - value.length)
  return `${label} ${'·'.repeat(dots)} ${value}`
}

// ASCII progress bar
const asciiBar = (pct: number, width: number = 10): string => {
  const filled = Math.round((Math.min(pct, 100) / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

export const ValidatorDetail = ({
  validator,
  auctionResult,
  dsSamConfig: _dsSamConfig,
  epochsPerYear,
  rank,
  totalValidators: _totalValidators,
  onClose,
  onSimulate,
  isCalculating,
}: ValidatorDetailProps) => {
  const winningApy = selectWinningAPY(auctionResult, epochsPerYear)
  const apyBreakdown = getApyBreakdown(validator, epochsPerYear)
  const bondUtilPct = calculateBondUtilization(validator)
  const bondRunway = validator.bondGoodForNEpochs ?? 0
  const bondHealth = getBondHealth(bondUtilPct, bondRunway)
  const tip = getValidatorTip(validator, winningApy, epochsPerYear)
  const tipStyle = getTipStyle(tip.urgency)
  const delta = formatStakeDelta(validator)

  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const currentMaxApy = apyBreakdown.total
  const voteAccount = selectVoteAccount(validator)

  const healthLabel =
    bondHealth === 'critical'
      ? '[CRITICAL]'
      : bondHealth === 'watch'
        ? '[WATCH]'
        : '[HEALTHY]'

  const [editBid, setEditBid] = useState(validator.revShare.bidPmpe.toString())
  const [editInflation, setEditInflation] = useState(
    (validator.inflationCommissionDec * 100).toString(),
  )
  const [editMev, setEditMev] = useState(
    validator.mevCommissionDec !== null
      ? (validator.mevCommissionDec * 100).toString()
      : '',
  )
  const [editBlock, setEditBlock] = useState(
    validator.blockRewardsCommissionDec !== null
      ? (validator.blockRewardsCommissionDec * 100).toString()
      : '',
  )

  const handleRunSimulation = () => {
    const bidValue = parseFloat(editBid)
    const inflationValue = parseFloat(editInflation) / 100
    const mevValue = editMev ? parseFloat(editMev) / 100 : null
    const blockValue = editBlock ? parseFloat(editBlock) / 100 : null

    onSimulate(
      !isNaN(inflationValue) ? inflationValue : null,
      mevValue,
      blockValue,
      !isNaN(bidValue) ? bidValue : null,
    )
  }

  const rankFactors = useMemo(() => {
    const factors: {
      name: string
      value: string
      note: string
      impact: 'positive' | 'negative' | 'neutral'
    }[] = []

    const apyMargin = currentMaxApy - winningApy
    factors.push({
      name: 'Max APY',
      value: formatPercentage(currentMaxApy, 2),
      note:
        apyMargin >= 0
          ? `+${formatPercentage(apyMargin, 2)} above cutoff`
          : `${formatPercentage(apyMargin, 2)} below cutoff`,
      impact: apyMargin >= 0 ? 'positive' : 'negative',
    })

    factors.push({
      name: 'Bond capacity',
      value: `${formatSolAmount(validator.bondBalanceSol, 0)}\u25CE`,
      note: `${bondUtilPct.toFixed(0)}% utilized, ~${Math.round(bondRunway)} epochs runway`,
      impact:
        bondUtilPct < 65
          ? 'positive'
          : bondUtilPct < 85
            ? 'neutral'
            : 'negative',
    })

    const samActive = validator.marinadeActivatedStakeSol
    const samTarget = validator.auctionStake.marinadeSamTargetSol
    const stakeGrowth = samTarget - samActive
    factors.push({
      name: 'Stake target',
      value: `${formatSolAmount(samTarget, 0)}\u25CE`,
      note:
        stakeGrowth > 0
          ? `Gaining ${formatSolAmount(stakeGrowth, 0)}\u25CE next epoch`
          : stakeGrowth < 0
            ? `Losing ${formatSolAmount(Math.abs(stakeGrowth), 0)}\u25CE`
            : 'At target allocation',
      impact:
        stakeGrowth > 0 ? 'positive' : stakeGrowth < 0 ? 'negative' : 'neutral',
    })

    const blockProd =
      validator.blockRewardsCommissionDec !== null
        ? (1 - validator.blockRewardsCommissionDec) * 100
        : 100
    factors.push({
      name: 'Block production',
      value: `${blockProd.toFixed(0)}%`,
      note: blockProd >= 100 ? 'Full uptime' : 'Missed slots reduce APY',
      impact: blockProd >= 100 ? 'positive' : 'negative',
    })

    return factors
  }, [validator, currentMaxApy, winningApy, bondUtilPct, bondRunway])

  const impactChar = (impact: string) =>
    impact === 'positive' ? 'ok' : impact === 'negative' ? '!!' : '--'

  return (
    <Sheet
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-4xl overflow-y-auto p-0 bg-background"
      >
        {/* Terminal Header */}
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10 font-mono text-[12px]">
          <div className="flex items-center justify-between">
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              {'<'} Back
            </button>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              [x]
            </button>
          </div>
          <div className="mt-2 text-foreground whitespace-pre">
            {`═══ VALIDATOR: #${rank} ${inSet ? '[IN SET]' : '[OUT]'} (${voteAccount}) ═══`}
          </div>
        </div>

        <div className="p-4 font-mono text-[12px] text-foreground space-y-4">
          {/* Why Rank Section */}
          <div>
            <div className="text-muted-foreground whitespace-pre">{`┌──── WHY RANK #${rank}? ────┐`}</div>
            {rankFactors.map(factor => (
              <div key={factor.name} className="whitespace-pre">
                {`│ ${impactChar(factor.impact)}  ${factor.name}: ${factor.value} (${factor.note})`}
              </div>
            ))}
            <div className="text-muted-foreground whitespace-pre">└──────────────────────────────┘</div>
          </div>

          {/* APY Composition */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-pre">{`┌──── APY COMPOSITION ────┐`}</span>
              <HelpTip text={HELP_TEXT.maxApy} />
            </div>
            <div className="whitespace-pre">{`│ ${dotLine('Inflation', formatPercentage(apyBreakdown.inflation, 2), 30)}`}</div>
            <div className="whitespace-pre">{`│ ${dotLine('MEV', formatPercentage(apyBreakdown.mev, 2), 30)}`}</div>
            <div className="whitespace-pre">{`│ ${dotLine('Blocks', formatPercentage(apyBreakdown.blockRewards, 2), 30)}`}</div>
            <div className="whitespace-pre">{`│ ${dotLine('Bid', formatPercentage(apyBreakdown.stakeBid, 2), 30)}`}</div>
            <div className="whitespace-pre">{`│ ${'─'.repeat(32)}`}</div>
            <div className="whitespace-pre text-primary">{`│ ${dotLine('TOTAL', formatPercentage(apyBreakdown.total, 2), 30)}`}</div>
            <div className="text-muted-foreground whitespace-pre">└──────────────────────────────┘</div>
          </div>

          {/* Bond Health */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-pre">{`┌──── BOND HEALTH ────┐`}</span>
              <HelpTip text={HELP_TEXT.bondHealth} />
            </div>
            <div className="whitespace-pre">{`│ ${healthLabel}  ${formatSolAmount(validator.bondBalanceSol, 0)} SOL`}</div>
            <div className="whitespace-pre">{`│ [${asciiBar(bondUtilPct)}] ${bondUtilPct.toFixed(1)}%  ~${Math.round(bondRunway)} epochs runway`}</div>
            <div className="text-muted-foreground whitespace-pre">└──────────────────────────────┘</div>
          </div>

          {/* Stake Overview */}
          <div>
            <div className="text-muted-foreground whitespace-pre">{`┌──── STAKE OVERVIEW ────┐`}</div>
            <div className="whitespace-pre">{`│ ${dotLine('Active Stake', `${formatSolAmount(validator.marinadeActivatedStakeSol, 0)} ◎`, 36)}`}</div>
            <div className="whitespace-pre">{`│ ${dotLine('Target Stake', `${formatSolAmount(validator.auctionStake.marinadeSamTargetSol, 0)} ◎`, 36)}`}</div>
            <div className="whitespace-pre" style={{ color: delta.color }}>{`│ ${dotLine('Stake Delta', `${delta.arrow} ${delta.text}`, 36)}`}</div>
            <div className="text-muted-foreground whitespace-pre">└──────────────────────────────┘</div>
          </div>

          {/* Next Step */}
          <div>
            <div className="text-muted-foreground whitespace-pre">{`┌──── NEXT STEP ────┐`}</div>
            <div className="whitespace-pre">{`│ ${tipStyle.icon} ${tip.text}`}</div>
            <div className="text-muted-foreground whitespace-pre">└──────────────────────────────┘</div>
          </div>

          {/* Simulation */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-pre">{`┌──── WHAT-IF SIMULATION ────┐`}</span>
              <HelpTip text={HELP_TEXT.simulation} />
            </div>
            <div className="space-y-2 mt-1 pl-2">
              <div>
                <label className="text-muted-foreground">{`> `}Stake Bid (PMPE)</label>
                <Input
                  type="number"
                  value={editBid}
                  onChange={e => setEditBid(e.target.value)}
                  step="0.001"
                  min="0"
                  className="font-mono text-[12px] mt-1"
                />
              </div>
              <div>
                <label className="text-muted-foreground">{`> `}Inflation Commission %</label>
                <Input
                  type="number"
                  value={editInflation}
                  onChange={e => setEditInflation(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  className="font-mono text-[12px] mt-1"
                />
              </div>
              <div>
                <label className="text-muted-foreground">{`> `}MEV Commission %</label>
                <Input
                  type="number"
                  value={editMev}
                  onChange={e => setEditMev(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="N/A"
                  className="font-mono text-[12px] mt-1"
                />
              </div>
              <div>
                <label className="text-muted-foreground">{`> `}Block Rewards Commission %</label>
                <Input
                  type="number"
                  value={editBlock}
                  onChange={e => setEditBlock(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="N/A"
                  className="font-mono text-[12px] mt-1"
                />
              </div>
              <Button
                className="w-full font-mono text-[12px] mt-2"
                onClick={handleRunSimulation}
                disabled={isCalculating}
              >
                {isCalculating ? 'Simulating...' : '[ Run Simulation ]'}
              </Button>
            </div>
            <div className="text-muted-foreground whitespace-pre mt-2">└──────────────────────────────┘</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

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
  getBondHealthStyle,
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
  nameMap?: Map<string, string>
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

export const ValidatorDetail = ({
  validator,
  auctionResult,
  dsSamConfig: _dsSamConfig,
  epochsPerYear,
  nameMap,
  rank,
  totalValidators,
  onClose,
  onSimulate,
  isCalculating,
}: ValidatorDetailProps) => {
  const voteAccount = selectVoteAccount(validator)
  const validatorName = nameMap?.get(voteAccount)
  const winningApy = selectWinningAPY(auctionResult, epochsPerYear)
  const apyBreakdown = getApyBreakdown(validator, epochsPerYear)
  const bondUtilPct = calculateBondUtilization(validator)
  const bondRunway = validator.bondGoodForNEpochs ?? 0
  const bondHealth = getBondHealth(bondUtilPct, bondRunway)
  const healthStyle = getBondHealthStyle(bondHealth)
  const tip = getValidatorTip(validator, winningApy, epochsPerYear)
  const tipStyle = getTipStyle(tip.urgency)
  const delta = formatStakeDelta(validator)

  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const currentMaxApy = apyBreakdown.total

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
      value: `${formatSolAmount(validator.bondBalanceSol, 0)} SOL`,
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
      value: `${formatSolAmount(samTarget, 0)} SOL`,
      note:
        stakeGrowth > 0
          ? `Gaining ${formatSolAmount(stakeGrowth, 0)} SOL next epoch`
          : stakeGrowth < 0
            ? `Losing ${formatSolAmount(Math.abs(stakeGrowth), 0)} SOL`
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

  const positionPct = inSet
    ? ((totalValidators - rank + 1) / totalValidators) * 100
    : 0

  return (
    <Sheet
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-4xl overflow-y-auto p-0"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M8.75 10.5L5.25 7L8.75 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to rankings
            </button>
            <span className="text-lg font-bold font-mono text-primary">
              #{rank}
            </span>
            {validatorName && (
              <span className="text-sm font-medium text-foreground">
                {validatorName}
              </span>
            )}
            <span className="text-sm font-mono text-secondary-foreground">
              {voteAccount.slice(0, 8)}...{voteAccount.slice(-4)}
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{
                background: inSet
                  ? 'var(--primary-light)'
                  : 'var(--destructive-light)',
                color: inSet ? 'var(--primary)' : 'var(--destructive)',
              }}
            >
              {inSet ? 'In Set' : 'Out of Set'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            &times;
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Why Rank #{rank}?
                <HelpTip text="Factors that determine your auction ranking. Improve negative factors to climb higher." />
              </h3>
              <div className="space-y-2 mt-3">
                {rankFactors.map(factor => (
                  <div
                    key={factor.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      factor.impact === 'positive'
                        ? 'border-primary/20 bg-[var(--primary-light)]'
                        : factor.impact === 'negative'
                          ? 'border-destructive/20 bg-[var(--destructive-light)]'
                          : 'border-border bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full">
                        {factor.impact === 'positive'
                          ? '\u2713'
                          : factor.impact === 'negative'
                            ? '\u2717'
                            : '\u2014'}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {factor.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {factor.note}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-semibold">
                      {factor.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Position vs Winning APY
                <HelpTip text={HELP_TEXT.winningApy} />
              </h3>
              <div className="mt-3">
                <div className="h-3 rounded-full bg-secondary relative overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(positionPct, 100)}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary/60"
                    style={{
                      left: `${(winningApy / (winningApy * 1.5)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-primary font-medium">
                    Winning: {formatPercentage(winningApy, 2)}
                  </span>
                  <span>You: {formatPercentage(currentMaxApy, 2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                APY Composition
                <HelpTip text={HELP_TEXT.maxApy} />
              </h3>
              <div className="flex h-4 rounded-full overflow-hidden mt-3">
                <div
                  className="transition-all"
                  style={{
                    width: `${(apyBreakdown.inflation / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-1)',
                  }}
                  title={`Inflation: ${formatPercentage(apyBreakdown.inflation, 2)}`}
                />
                <div
                  className="transition-all"
                  style={{
                    width: `${(apyBreakdown.mev / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-2)',
                  }}
                  title={`MEV: ${formatPercentage(apyBreakdown.mev, 2)}`}
                />
                <div
                  className="transition-all"
                  style={{
                    width: `${(apyBreakdown.blockRewards / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-3)',
                  }}
                  title={`Block Rewards: ${formatPercentage(apyBreakdown.blockRewards, 2)}`}
                />
                <div
                  className="transition-all"
                  style={{
                    width: `${(apyBreakdown.stakeBid / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-4)',
                  }}
                  title={`Stake Bid: ${formatPercentage(apyBreakdown.stakeBid, 2)}`}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: 'var(--chart-1)' }}
                  />
                  Inflation {formatPercentage(apyBreakdown.inflation, 2)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: 'var(--chart-2)' }}
                  />
                  MEV {formatPercentage(apyBreakdown.mev, 2)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: 'var(--chart-3)' }}
                  />
                  Blocks {formatPercentage(apyBreakdown.blockRewards, 2)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: 'var(--chart-4)' }}
                  />
                  Bid {formatPercentage(apyBreakdown.stakeBid, 2)}
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Next Step
                <HelpTip text="Actionable recommendation based on your current position and constraints." />
              </h3>
              <div
                className="p-3 rounded-lg flex items-center gap-2 text-sm mt-3"
                style={{ background: tipStyle.bg, color: tipStyle.color }}
              >
                <span>{tipStyle.icon}</span>
                <span>{tip.text}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                What-If Simulation
                <HelpTip text={HELP_TEXT.simulation} />
              </h3>
              <div className="space-y-3 mt-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Stake Bid (PMPE)
                  </label>
                  <Input
                    type="number"
                    value={editBid}
                    onChange={e => setEditBid(e.target.value)}
                    step="0.001"
                    min="0"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Inflation Commission %
                  </label>
                  <Input
                    type="number"
                    value={editInflation}
                    onChange={e => setEditInflation(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    MEV Commission %
                  </label>
                  <Input
                    type="number"
                    value={editMev}
                    onChange={e => setEditMev(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="N/A"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Block Rewards Commission %
                  </label>
                  <Input
                    type="number"
                    value={editBlock}
                    onChange={e => setEditBlock(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="N/A"
                    className="font-mono"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleRunSimulation}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Simulating...' : 'Run Simulation'}
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Bond Health
                <HelpTip text={HELP_TEXT.bondHealth} />
              </h3>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-medium"
                    style={{
                      color: healthStyle.color,
                      background: healthStyle.bg,
                    }}
                  >
                    {healthStyle.label}
                  </span>
                  <span className="text-sm font-mono">
                    {formatSolAmount(validator.bondBalanceSol, 0)} SOL
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Utilization
                    </span>
                    <div className="text-sm font-semibold font-mono">
                      {bondUtilPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Runway
                    </span>
                    <div className="text-sm font-semibold font-mono">
                      ~{Math.round(bondRunway)} epochs
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Stake Overview
              </h3>
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Active Stake
                  </span>
                  <span className="text-sm font-semibold font-mono">
                    {formatSolAmount(validator.marinadeActivatedStakeSol, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Target Stake
                  </span>
                  <span className="text-sm font-semibold font-mono">
                    {formatSolAmount(
                      validator.auctionStake.marinadeSamTargetSol,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Stake Delta
                  </span>
                  <span
                    className="text-sm font-semibold font-mono"
                    style={{ color: delta.color }}
                  >
                    {delta.arrow} {delta.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

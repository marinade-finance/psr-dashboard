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
          <div className="flex items-center gap-3 font-mono">
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              {'<'} Back
            </button>
            <span className="text-lg font-bold text-primary">#{rank}</span>
            <span className="text-sm text-muted-foreground">
              {selectVoteAccount(validator).slice(0, 12)}...
            </span>
            <span className="text-xs text-foreground">
              {inSet ? '[IN SET]' : '[OUT]'}
            </span>
          </div>
          <button
            className="text-2xl text-muted-foreground hover:text-foreground font-mono"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div className="space-y-6">
            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono flex items-center gap-2">
                :: Why Rank #{rank}?
                <HelpTip text="Factors that determine your auction ranking." />
              </h3>
              <div className="space-y-2 mt-3">
                {rankFactors.map(factor => (
                  <div
                    key={factor.name}
                    className="flex items-center justify-between p-3 border border-border font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        {factor.impact === 'positive'
                          ? 'ok'
                          : factor.impact === 'negative'
                            ? '!!'
                            : '--'}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
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

            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono flex items-center gap-2">
                :: APY Composition
                <HelpTip text={HELP_TEXT.maxApy} />
              </h3>
              <div className="space-y-1 mt-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">| Inflation</span>
                  <span>{formatPercentage(apyBreakdown.inflation, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">| MEV</span>
                  <span>{formatPercentage(apyBreakdown.mev, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">| Blocks</span>
                  <span>{formatPercentage(apyBreakdown.blockRewards, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">| Bid</span>
                  <span>{formatPercentage(apyBreakdown.stakeBid, 2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatPercentage(apyBreakdown.total, 2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono flex items-center gap-2">
                :: Next Step
              </h3>
              <div className="mt-3 font-mono text-sm text-foreground">
                <span className="text-muted-foreground">{tipStyle.icon} </span>
                {tip.text}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono flex items-center gap-2">
                :: What-If Simulation
                <HelpTip text={HELP_TEXT.simulation} />
              </h3>
              <div className="space-y-3 mt-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">
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
                  <label className="text-xs font-mono text-muted-foreground">
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
                  <label className="text-xs font-mono text-muted-foreground">
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
                  <label className="text-xs font-mono text-muted-foreground">
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
                  {isCalculating ? 'Simulating...' : '[ Run Simulation ]'}
                </Button>
              </div>
            </div>

            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono flex items-center gap-2">
                :: Bond Health
                <HelpTip text={HELP_TEXT.bondHealth} />
              </h3>
              <div className="mt-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{healthLabel}</span>
                  <span className="text-sm">
                    {formatSolAmount(validator.bondBalanceSol, 0)} SOL
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      :: Utilization
                    </span>
                    <div className="text-sm font-semibold">
                      {bondUtilPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      :: Runway
                    </span>
                    <div className="text-sm font-semibold">
                      ~{Math.round(bondRunway)} epochs
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border p-5">
              <h3 className="text-base font-semibold text-foreground font-mono">
                :: Stake Overview
              </h3>
              <div className="space-y-3 mt-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Active Stake
                  </span>
                  <span className="text-sm font-semibold">
                    {formatSolAmount(validator.marinadeActivatedStakeSol, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Target Stake
                  </span>
                  <span className="text-sm font-semibold">
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
                    className="text-sm font-semibold"
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

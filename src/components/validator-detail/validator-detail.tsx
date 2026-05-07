import React, { useEffect, useMemo, useRef, useState } from 'react'

import { BidPenaltyBreakdown } from 'src/components/breakdowns/bid-penalty'
import { BondCoverageBreakdown } from 'src/components/breakdowns/bond-coverage'
import { SamRevenueBreakdown } from 'src/components/breakdowns/sam-revenue'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { ApyCompositionCard } from 'src/components/validator-detail/apy-composition-card'
import { formatSolAmount, pay } from 'src/format'
import {
  CSS_PRIMARY,
  CSS_DESTRUCTIVE,
  CSS_PRIMARY_LIGHT,
  CSS_DESTRUCTIVE_LIGHT,
  CSS_STATUS_GREEN,
} from 'src/lib/utils'
import {
  bondHealthFromAuction,
  computeBondCoverageMetrics,
  computeSamRevenueMetrics,
  computeBidPenaltyMetrics,
} from 'src/services/breakdowns'
import { HELP_TEXT } from 'src/services/help-text'
import {
  selectExpectedStakeChange,
  selectVoteAccount,
  selectWinningAPY,
} from 'src/services/sam'
import {
  getApyBreakdown,
  getValidatorTip,
  getTipStyle,
} from 'src/services/tip-engine'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { BondCoverageMetrics } from 'src/services/breakdowns'
import type { AugmentedAuctionValidator } from 'src/services/sam'

interface ValidatorDetailProps {
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  epochsPerYear: number
  nameMap?: Map<string, { name?: string }>
  rank: number
  isSimulated?: boolean
  onClose: () => void
  onSimulate: (
    inflationCommission: number | null,
    mevCommission: number | null,
    blockRewardsCommission: number | null,
    bidPmpe: number | null,
  ) => void
  onClearSimulation?: () => void
  isCalculating: boolean
}

type Tab = 'overview' | 'bond' | 'revenue' | 'penalty'

type BondHealth = 'healthy' | 'watch' | 'critical'

function bondCoverageLabel(
  health: BondHealth,
  coverage: BondCoverageMetrics,
): string {
  if (health === 'critical')
    return coverage.topUpToMin > 0
      ? `Top up ${pay(coverage.topUpToMin)}`
      : 'Critical'
  if (health === 'watch')
    return coverage.topUpToIdeal > 0
      ? `Top up ${pay(coverage.topUpToIdeal)}`
      : 'Watch'
  return 'Fully covered'
}

function bondCoverageColor(health: BondHealth): string {
  if (health === 'critical') return CSS_DESTRUCTIVE
  if (health === 'watch') return 'var(--warning)'
  return CSS_PRIMARY
}

const MetricRow = ({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: React.ReactNode
  valueStyle?: React.CSSProperties
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold font-mono" style={valueStyle}>
      {value}
    </span>
  </div>
)

export const ValidatorDetail = ({
  validator,
  auctionResult,
  dsSamConfig,
  epochsPerYear,
  nameMap,
  rank,
  isSimulated = false,
  onClose,
  onSimulate,
  onClearSimulation,
  isCalculating,
}: ValidatorDetailProps) => {
  const voteAccount = selectVoteAccount(validator)
  const validatorName = nameMap?.get(voteAccount)?.name
  const winningApy = selectWinningAPY(auctionResult, epochsPerYear)
  const winningTotalPmpe = auctionResult.winningTotalPmpe
  const apyBreakdown = getApyBreakdown(validator, epochsPerYear)
  const bondRunway = validator.bondGoodForNEpochs ?? 0
  const bondHealth = bondHealthFromAuction(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )
  const tip = getValidatorTip(validator, dsSamConfig, winningTotalPmpe)
  const tipStyle = getTipStyle(tip.urgency)
  const expectedStakeDelta = selectExpectedStakeChange(validator)
  const [tab, setTab] = useState<Tab>('overview')

  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const inSetCount = useMemo(
    () =>
      auctionResult.auctionData.validators.filter(
        v => v.auctionStake.marinadeSamTargetSol > 0,
      ).length,
    [auctionResult],
  )
  const cutoffRank = inSet ? inSetCount - rank : -(rank - inSetCount)
  const bondCoverage = useMemo(
    () =>
      computeBondCoverageMetrics(
        validator,
        dsSamConfig.minBondEpochs,
        dsSamConfig.idealBondEpochs,
        winningTotalPmpe,
        dsSamConfig.bondRiskFeeMult,
      ),
    [validator, dsSamConfig, winningTotalPmpe],
  )
  const paymentMetrics = useMemo(
    () => computeSamRevenueMetrics(validator),
    [validator],
  )
  const penaltyMetrics = useMemo(
    () => computeBidPenaltyMetrics(validator, dsSamConfig, winningTotalPmpe),
    [validator, dsSamConfig, winningTotalPmpe],
  )

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
  const [simEnabled, setSimEnabled] = useState(isSimulated)

  // Auto-sync the toggle when the parent simulation state changes (e.g. user
  // clears all simulations elsewhere).
  useEffect(() => {
    if (isSimulated) setSimEnabled(true)
  }, [isSimulated])

  // Debounced auto-recalc whenever inputs change while simulation is enabled.
  // 400ms covers fast number-input arrow clicking without thrashing the SDK.
  const firstRun = useRef(true)
  useEffect(() => {
    if (!simEnabled) return undefined
    if (firstRun.current) {
      firstRun.current = false
      // Don't auto-fire on the very first enable — only on subsequent edits.
      return undefined
    }
    const t = setTimeout(() => {
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
    }, 400)
    return () => clearTimeout(t)
  }, [simEnabled, editBid, editInflation, editMev, editBlock, onSimulate])

  const handleSimToggle = (enabled: boolean) => {
    setSimEnabled(enabled)
    firstRun.current = true
    if (!enabled && onClearSimulation) onClearSimulation()
  }

  return (
    <Sheet
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className={`w-full max-w-4xl overflow-y-auto p-0 ${
          isSimulated
            ? 'border-t-4 border-t-[var(--status-yellow,#b58900)]'
            : ''
        }`}
      >
        <div
          className={`flex items-start justify-between px-4 sm:px-6 py-4 border-b border-border sticky top-0 z-10 gap-2 ${
            isSimulated
              ? 'bg-[var(--status-yellow-light,rgba(181,137,0,0.06))]'
              : 'bg-background'
          }`}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
              onClick={onClose}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 flex flex-col leading-tight">
                <span
                  className="text-base font-bold font-mono flex items-center gap-1"
                  style={{ color: tipStyle.color }}
                >
                  <span className="text-sm leading-none">{tipStyle.icon}</span>#
                  {rank}
                </span>
                <span
                  className={`text-xs font-mono ${inSet ? 'text-muted-foreground' : 'text-destructive'}`}
                >
                  {inSet
                    ? cutoffRank === 0
                      ? 'at cutoff'
                      : `${cutoffRank} above cutoff`
                    : `${Math.abs(cutoffRank)} below cutoff`}
                </span>
              </span>
              {validatorName && (
                <span className="text-sm font-semibold text-foreground">
                  {validatorName}
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                style={{
                  background: inSet ? CSS_PRIMARY_LIGHT : CSS_DESTRUCTIVE_LIGHT,
                  color: inSet ? CSS_PRIMARY : CSS_DESTRUCTIVE,
                }}
              >
                {inSet ? 'In Set' : 'Out of Set'}
              </span>
              {isSimulated && (
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 uppercase tracking-wide"
                  style={{
                    background:
                      'var(--status-yellow-light, rgba(181,137,0,0.18))',
                    color: 'var(--status-yellow, #b58900)',
                  }}
                  title="This validator's metrics reflect simulated commission/bid overrides"
                >
                  Simulated
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground break-all leading-tight">
              {voteAccount}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label
              className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none"
              title="When enabled, edits to commission/bid below auto-recalculate the auction"
            >
              <span className="text-muted-foreground">Simulate</span>
              <span
                role="switch"
                aria-checked={simEnabled}
                onClick={() => handleSimToggle(!simEnabled)}
                className={`relative inline-block w-9 h-5 rounded-full transition-colors ${
                  simEnabled
                    ? 'bg-[var(--status-yellow,#b58900)]'
                    : 'bg-secondary'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    simEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </label>
            {isSimulated && onClearSimulation && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/5 h-7 px-2 text-xs"
                onClick={onClearSimulation}
                disabled={isCalculating}
              >
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              &times;
            </Button>
          </div>
        </div>

        {(() => {
          const tipTarget: Tab | null =
            tip.constraint === 'bond'
              ? 'bond'
              : tip.constraint === 'bid'
                ? 'overview'
                : null
          return (
            <div
              className={`px-4 sm:px-6 py-3 flex items-center gap-3 ${tipTarget ? 'cursor-pointer select-none' : ''}`}
              style={{ background: tipStyle.bg }}
              onClick={tipTarget ? () => setTab(tipTarget) : undefined}
            >
              <span
                className="text-sm font-medium flex-1"
                style={{ color: tipStyle.color }}
              >
                {tip.text}
              </span>
              {tipTarget && (
                <span
                  className="text-xs font-medium shrink-0 px-2 py-0.5 rounded border whitespace-nowrap"
                  style={{
                    color: tipStyle.color,
                    borderColor: tipStyle.color,
                    background: 'rgba(255,255,255,0.55)',
                  }}
                >
                  {tip.constraint === 'bond' ? 'Bond tab →' : 'Simulate →'}
                </span>
              )}
            </div>
          )
        })()}

        <div className="border-b border-border bg-background sticky top-[96px] z-[5]">
          <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto">
            {(
              [
                ['overview', 'Overview'],
                ['revenue', 'Payments'],
                ['bond', 'Bond'],
                ['penalty', 'Bid Penalty'],
              ] satisfies [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'bond' && (
          <div className="p-4 sm:p-6">
            <BondCoverageBreakdown
              validator={validator}
              dsSamConfig={dsSamConfig}
              winningTotalPmpe={winningTotalPmpe}
              bondState={bondHealth}
              isSimulated={isSimulated}
            />
          </div>
        )}

        {tab === 'revenue' && (
          <div className="p-4 sm:p-6">
            <SamRevenueBreakdown
              validator={validator}
              isSimulated={isSimulated}
            />
          </div>
        )}

        {tab === 'penalty' && (
          <div className="p-4 sm:p-6">
            <BidPenaltyBreakdown
              validator={validator}
              dsSamConfig={dsSamConfig}
              winningTotalPmpe={winningTotalPmpe}
              isSimulated={isSimulated}
            />
          </div>
        )}

        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 ${tab === 'overview' ? '' : 'hidden'}`}
        >
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Stake
              </h3>
              <div className="space-y-3 mt-3">
                <MetricRow
                  label="Active"
                  value={`${formatSolAmount(validator.marinadeActivatedStakeSol, 0)} SOL`}
                />
                <MetricRow
                  label="Target"
                  value={`${formatSolAmount(validator.auctionStake.marinadeSamTargetSol, 0)} SOL`}
                />
                <MetricRow
                  label="Next epoch"
                  value={
                    expectedStakeDelta > 0
                      ? `+${formatSolAmount(expectedStakeDelta, 0)} SOL`
                      : expectedStakeDelta < 0
                        ? `${formatSolAmount(expectedStakeDelta, 0)} SOL`
                        : '0 SOL'
                  }
                  valueStyle={{
                    color:
                      expectedStakeDelta > 0
                        ? CSS_STATUS_GREEN
                        : expectedStakeDelta < 0
                          ? CSS_DESTRUCTIVE
                          : 'var(--muted-foreground)',
                  }}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Bond
                <HelpTip text={HELP_TEXT.bondHealth} />
              </h3>
              <div className="mt-3 space-y-3">
                <MetricRow
                  label="Balance"
                  value={`${formatSolAmount(validator.bondBalanceSol, 0)} SOL`}
                />
                <MetricRow
                  label="Coverage"
                  value={bondCoverageLabel(bondHealth, bondCoverage)}
                  valueStyle={{ color: bondCoverageColor(bondHealth) }}
                />
                <MetricRow
                  label="Runway"
                  value={
                    bondRunway <= 0
                      ? 'Depleted'
                      : `${Math.round(bondRunway)} epochs`
                  }
                />
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setTab('bond')}
                >
                  See full bond coverage breakdown →
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                Payment This Epoch
                <HelpTip text="SOL paid to Marinade this epoch: bid cost on active stake, cost on activating stake, and any bid-too-low penalty." />
              </h3>
              <div className="space-y-3">
                <MetricRow
                  label="Bid (active stake)"
                  value={`${formatSolAmount(paymentMetrics.cost, 2)} SOL`}
                />
                <MetricRow
                  label="Activating stake"
                  value={`${formatSolAmount(paymentMetrics.activatingCost, 2)} SOL`}
                />
                <MetricRow
                  label="Penalty"
                  value={
                    penaltyMetrics.penaltySol > 0
                      ? `${formatSolAmount(penaltyMetrics.penaltySol, 2)} SOL`
                      : '—'
                  }
                  valueStyle={
                    penaltyMetrics.penaltySol > 0
                      ? { color: CSS_DESTRUCTIVE }
                      : undefined
                  }
                />
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setTab('revenue')}
                >
                  See full payments breakdown →
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ApyCompositionCard
              apyBreakdown={apyBreakdown}
              winningApy={winningApy}
            />

            {simEnabled && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  What-If Simulation
                  <HelpTip text={HELP_TEXT.simulation} />
                </h3>
                <fieldset className="space-y-3 mt-3">
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
                </fieldset>
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {isCalculating ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-yellow,#b58900)] animate-pulse" />
                        Recalculating…
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-green,#2aa198)]" />
                        Auto-recalc on change
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

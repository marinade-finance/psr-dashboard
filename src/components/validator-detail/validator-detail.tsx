import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'

import { BidPenaltyBreakdown } from 'src/components/breakdowns/bid-penalty'
import { BondCoverageBreakdown } from 'src/components/breakdowns/bond-coverage'
import { SamRevenueBreakdown } from 'src/components/breakdowns/sam-revenue'
import {
  CalcCard,
  CalcRow,
  SectionHeader,
} from 'src/components/breakdowns/shared'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { Switch } from 'src/components/ui/switch'
import { ApyCompositionCard } from 'src/components/validator-detail/apy-composition-card'
import { formatSolAmount, pay, pmpe } from 'src/format'
import {
  CSS_PRIMARY,
  CSS_DESTRUCTIVE,
  CSS_PRIMARY_LIGHT,
  CSS_DESTRUCTIVE_LIGHT,
  CSS_STATUS_GREEN,
  CSS_STATUS_YELLOW,
  CSS_WARNING,
  CSS_MUTED_FG,
} from 'src/lib/utils'
import {
  bondHealthFromAuction,
  computeBondCoverageMetrics,
  computeSamRevenueMetrics,
  computeBidPenaltyMetrics,
} from 'src/services/breakdowns'
import { HELP_TEXT } from 'src/services/help-text'
import {
  isProtectedEvent,
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import { fetchPsrEstimatesForValidator } from 'src/services/protected-events-estimator'
import {
  selectExpectedStakeChange,
  selectMaxAPY,
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
import type { NotificationSummary } from 'src/services/notifications'
import type { AugmentedAuctionValidator } from 'src/services/sam'

interface ValidatorDetailProps {
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  epochsPerYear: number
  nameMap?: Map<string, { name?: string }>
  notificationsMap?: Record<string, NotificationSummary>
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

type Tab =
  | 'overview'
  | 'notifications'
  | 'bond'
  | 'revenue'
  | 'penalty'
  | 'payments'

type BondHealth = 'healthy' | 'soft' | 'watch' | 'critical'

function bondCoverageLabel(
  health: BondHealth,
  coverage: BondCoverageMetrics,
): string {
  if (health === 'critical')
    return coverage.topUpToAvoidFee > 0
      ? `Top up ${pay(coverage.topUpToAvoidFee)} to avoid fee`
      : 'Critical'
  if (health === 'watch')
    return coverage.topUpToKeepStake > 0
      ? `Top up ${pay(coverage.topUpToKeepStake)} to keep stake`
      : 'Watch'
  if (health === 'soft')
    return coverage.topUpToIdealKeep > 0
      ? `Top up ${pay(coverage.topUpToIdealKeep)} for more stake`
      : 'OK'
  return 'Fully covered'
}

function bondCoverageColor(health: BondHealth): string {
  if (health === 'critical') return CSS_DESTRUCTIVE
  if (health === 'watch') return CSS_WARNING
  if (health === 'soft') return CSS_MUTED_FG
  return CSS_PRIMARY
}

const MetricRow = ({
  label,
  help,
  value,
  valueStyle,
}: {
  label: string
  help?: string
  value: React.ReactNode
  valueStyle?: React.CSSProperties
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      {label}
      {help && <HelpTip text={help} />}
    </span>
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
  notificationsMap,
  rank,
  isSimulated = false,
  onClose,
  onSimulate,
  onClearSimulation,
  isCalculating,
}: ValidatorDetailProps) => {
  const voteAccount = selectVoteAccount(validator)
  const validatorName = nameMap?.get(voteAccount)?.name
  const notificationSummary = notificationsMap?.[voteAccount]
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
  // In-set/out-of-set validators are interleaved by maxApy when the auction
  // skips high-yield validators (constraints, blacklist) for lower-yield ones,
  // so the cutoff distance must be counted, not derived from rank − inSetCount.
  const cutoffRank = useMemo(() => {
    const ourApy = selectMaxAPY(validator, epochsPerYear)
    let count = 0
    for (const v of auctionResult.auctionData.validators) {
      if (selectVoteAccount(v) === voteAccount) continue
      const vInSet = v.auctionStake.marinadeSamTargetSol > 0
      const vApy = selectMaxAPY(v, epochsPerYear)
      if (inSet && vInSet && vApy < ourApy) count++
      else if (!inSet && !vInSet && vApy > ourApy) count++
    }
    return inSet ? count : -count
  }, [auctionResult, validator, voteAccount, inSet, epochsPerYear])
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
  const { data: psrEstimates = [] } = useQuery(
    ['psrEstimates', voteAccount],
    () => fetchPsrEstimatesForValidator(voteAccount),
    { staleTime: 5 * 60 * 1000 },
  )

  const bondRiskFeeSol = validator.values.bondRiskFeeSol ?? 0
  const blacklistPenaltySol =
    (validator.revShare.blacklistPenaltyPmpe / 1000) *
    validator.marinadeActivatedStakeSol
  const bidTooLowPenaltySol = penaltyMetrics.penaltySol

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
          isSimulated ? 'border-t-4 border-t-status-yellow' : ''
        }`}
      >
        <div
          className={`flex items-start justify-between px-4 sm:px-6 py-4 border-b border-border sticky top-0 z-10 gap-2 ${
            isSimulated ? 'bg-status-yellow-light' : 'bg-background'
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
                  <span className="text-sm leading-none">
                    {tip.icon ?? tipStyle.icon}
                  </span>
                  #{rank}
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
                  className="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 uppercase tracking-wide bg-status-yellow-light text-status-yellow"
                  title="Numbers shown here use your what-if commission and bid, not the live values."
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
              title="Turn this on to see how changing your commission or bid would shift your rank — updates as you type."
            >
              <span className="text-muted-foreground">Simulate</span>
              <Switch
                checked={simEnabled}
                onCheckedChange={handleSimToggle}
                aria-label="Toggle simulation mode"
              />
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
              aria-label="Close"
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
                  className="text-xs font-medium shrink-0 px-2 py-0.5 rounded border whitespace-nowrap bg-card/55"
                  style={{
                    color: tipStyle.color,
                    borderColor: tipStyle.color,
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
                ['notifications', 'Notifications'],
                ['payments', 'Payments'],
                ['revenue', 'Bidding'],
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

        {tab === 'notifications' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">
                Pending penalties — this epoch
              </h3>
              <div className="space-y-3">
                <MetricRow
                  label="Bid-too-low penalty"
                  value={
                    bidTooLowPenaltySol > 0
                      ? `${formatSolAmount(bidTooLowPenaltySol, 2)} SOL`
                      : '—'
                  }
                  valueStyle={
                    bidTooLowPenaltySol > 0
                      ? { color: CSS_DESTRUCTIVE }
                      : undefined
                  }
                />
                <MetricRow
                  label="Blacklist penalty"
                  value={
                    blacklistPenaltySol > 0
                      ? `${formatSolAmount(blacklistPenaltySol, 2)} SOL`
                      : '—'
                  }
                  valueStyle={
                    blacklistPenaltySol > 0
                      ? { color: CSS_DESTRUCTIVE }
                      : undefined
                  }
                />
                <MetricRow
                  label="Bond risk fee"
                  value={
                    bondRiskFeeSol > 0
                      ? `${formatSolAmount(bondRiskFeeSol, 2)} SOL`
                      : '—'
                  }
                  valueStyle={
                    bondRiskFeeSol > 0 ? { color: CSS_DESTRUCTIVE } : undefined
                  }
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">
                Notifications
              </h3>
              {notificationSummary?.notifications?.length ? (
                <div className="space-y-4">
                  {notificationSummary.notifications.map(n => {
                    const tone =
                      n.priority === 'critical'
                        ? 'bg-destructive-light text-destructive'
                        : n.priority === 'warning'
                          ? 'bg-warning-light text-warning'
                          : 'bg-info-light text-info'
                    const [body, ...footerParts] =
                      n.message.split('\n\nEmitted:')
                    const footer = footerParts.length
                      ? `Emitted:${footerParts.join('\n\nEmitted:')}`
                      : null
                    return (
                      <div
                        key={n.id}
                        className="border-t border-border first:border-t-0 first:pt-0 pt-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${tone}`}
                          >
                            {n.priority}
                          </span>
                          {n.title && (
                            <span className="text-sm font-semibold text-foreground">
                              {n.title}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-pre-line">
                          {body}
                        </div>
                        {footer && (
                          <div className="text-[10px] text-muted-foreground italic mt-1.5">
                            {footer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notifications for this validator.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'bond' && (
          <div className="p-4 sm:p-6">
            <BondCoverageBreakdown
              validator={validator}
              dsSamConfig={dsSamConfig}
              winningTotalPmpe={winningTotalPmpe}
              bondState={bondHealth}
              bondRiskFeeSol={bondRiskFeeSol}
              isSimulated={isSimulated}
              onGoToSim={() => {
                setSimEnabled(true)
                setTab('overview')
              }}
            />
          </div>
        )}

        {tab === 'payments' &&
          (() => {
            const psrTotal = psrEstimates.reduce(
              (sum, e) => sum + selectAmount(e),
              0,
            )
            const total =
              paymentMetrics.total +
              bidTooLowPenaltySol +
              blacklistPenaltySol +
              bondRiskFeeSol +
              psrTotal
            const hasPenalty =
              bidTooLowPenaltySol > 0 ||
              blacklistPenaltySol > 0 ||
              bondRiskFeeSol > 0
            return (
              <div className="p-4 sm:p-6 space-y-6">
                <CalcCard title="Payments Calculation" guideTo="/docs">
                  <table className="w-full">
                    <tbody>
                      <SectionHeader title="Bid costs" />
                      <CalcRow
                        label="Active stake bid"
                        value={pay(paymentMetrics.cost)}
                      />
                      <CalcRow
                        label="Activating stake bid"
                        value={pay(paymentMetrics.activatingCost)}
                      />
                      <SectionHeader title="Penalties" />
                      <CalcRow
                        label="Bid-too-low penalty"
                        value={
                          penaltyMetrics.penaltySol > 0
                            ? pay(penaltyMetrics.penaltySol)
                            : '—'
                        }
                        accent={
                          penaltyMetrics.penaltySol > 0 ? 'red' : undefined
                        }
                      />
                      <CalcRow
                        label="Blacklist penalty"
                        value={
                          blacklistPenaltySol > 0
                            ? pay(blacklistPenaltySol)
                            : '—'
                        }
                        accent={blacklistPenaltySol > 0 ? 'red' : undefined}
                      />
                      <CalcRow
                        label="Bond risk fee"
                        value={bondRiskFeeSol > 0 ? pay(bondRiskFeeSol) : '—'}
                        accent={bondRiskFeeSol > 0 ? 'red' : undefined}
                      />
                      {psrEstimates.length > 0 && (
                        <>
                          <SectionHeader title="PSR Settlements (estimated)" />
                          {psrEstimates.map((e, i) => {
                            const label = isProtectedEvent(e.reason)
                              ? selectProtectedStakeReason(e)
                              : e.reason
                            return (
                              <CalcRow
                                key={i}
                                label={String(label)}
                                secondary={
                                  e.meta.funder === 'ValidatorBond'
                                    ? 'from bond'
                                    : 'from Marinade'
                                }
                                value={pay(selectAmount(e))}
                                accent="red"
                              />
                            )
                          })}
                        </>
                      )}
                      <CalcRow
                        label="Total"
                        value={pay(total)}
                        bold
                        large
                        separator
                      />
                    </tbody>
                  </table>
                  <div
                    className={`mt-4 pt-3 border-t flex flex-col gap-2 ${hasPenalty || psrTotal > 0 ? 'border-destructive/30' : 'border-border'}`}
                  >
                    {penaltyMetrics.penaltySol > 0 && (
                      <button
                        className="text-xs text-destructive hover:underline text-left"
                        onClick={() => setTab('penalty')}
                      >
                        See bid-too-low penalty calculation →
                      </button>
                    )}
                    <button
                      className="text-xs text-primary hover:underline text-left"
                      onClick={() => {
                        setSimEnabled(true)
                        setTab('overview')
                      }}
                    >
                      Simulate commission or bid changes →
                    </button>
                  </div>
                </CalcCard>
              </div>
            )
          })()}

        {tab === 'revenue' && (
          <div className="p-4 sm:p-6">
            <SamRevenueBreakdown
              validator={validator}
              isSimulated={isSimulated}
              onGoToSim={() => {
                setSimEnabled(true)
                setTab('overview')
              }}
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
              onGoToSim={() => {
                setSimEnabled(true)
                setTab('overview')
              }}
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
                  help="How much SOL Marinade has staked with you right now."
                  value={`${formatSolAmount(validator.marinadeActivatedStakeSol, 0)} SOL`}
                />
                <MetricRow
                  label="Target"
                  help="How much stake the auction decided you should have this epoch, based on your bid and how you scored."
                  value={`${formatSolAmount(validator.auctionStake.marinadeSamTargetSol, 0)} SOL`}
                />
                <MetricRow
                  label="Next epoch"
                  help="How much stake you should gain or lose next epoch. Gains are capped by how much new SOL Marinade has to spread around; losses come from stakers withdrawing."
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
                          : CSS_MUTED_FG,
                  }}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Bond
                <HelpTip text="SOL you've locked up as a deposit. It pays your bid each epoch and reimburses stakers if you misbehave. Coverage tells you whether it's thick enough; runway tells you how many epochs it'll last." />
              </h3>
              <div className="mt-3 space-y-3">
                <MetricRow
                  label="Balance"
                  value={`${formatSolAmount(validator.bondBalanceSol, 0)} SOL`}
                />
                <MetricRow
                  label="Reserve"
                  help={HELP_TEXT.bondCoverage}
                  value={bondCoverageLabel(bondHealth, bondCoverage)}
                  valueStyle={{ color: bondCoverageColor(bondHealth) }}
                />
                <MetricRow
                  label="Bid runway"
                  help={HELP_TEXT.bondRunway}
                  value={
                    bondRunway <= 0
                      ? 'Depleted'
                      : `${Math.round(bondRunway)} epochs`
                  }
                />
                {bondRiskFeeSol > 0 && (
                  <MetricRow
                    label="Bond risk fee"
                    help="An extra fee Marinade takes out of your bond when it slips below the minimum we want you to keep. Stop the leak by topping the bond back up."
                    value={`${formatSolAmount(bondRiskFeeSol, 2)} SOL`}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                  />
                )}
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
                Expected Payment This Epoch
                <HelpTip text="What you'll owe Marinade this epoch. Includes your bid on stake you already hold, your bid on stake that's still warming up, and any penalties for cutting your bid mid-epoch." />
              </h3>
              <div className="space-y-3">
                <MetricRow
                  label="Payment for active stake"
                  value={`${formatSolAmount(paymentMetrics.cost, 2)} SOL`}
                />
                <MetricRow
                  label="Payment for activating stake"
                  value={`${formatSolAmount(paymentMetrics.activatingCost, 2)} SOL`}
                />
                {paymentMetrics.activating > 0 && (
                  <MetricRow
                    label="↳ bid gap"
                    help={HELP_TEXT.bidGap}
                    value={`${pmpe(paymentMetrics.bidGap)} PMPE`}
                    valueStyle={{
                      color:
                        paymentMetrics.bidGap > 2
                          ? CSS_STATUS_YELLOW
                          : CSS_MUTED_FG,
                      fontSize: '11px',
                    }}
                  />
                )}
                {bidTooLowPenaltySol > 0 && (
                  <MetricRow
                    label="Bid-too-low penalty"
                    value={`${formatSolAmount(bidTooLowPenaltySol, 2)} SOL`}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                  />
                )}
                {blacklistPenaltySol > 0 && (
                  <MetricRow
                    label="Blacklist penalty"
                    value={`${formatSolAmount(blacklistPenaltySol, 2)} SOL`}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                  />
                )}
                {bondRiskFeeSol > 0 && (
                  <MetricRow
                    label="Bond risk fee"
                    value={`${formatSolAmount(bondRiskFeeSol, 2)} SOL`}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                  />
                )}
                {bidTooLowPenaltySol === 0 &&
                  blacklistPenaltySol === 0 &&
                  bondRiskFeeSol === 0 && (
                    <MetricRow label="Penalty" value="—" />
                  )}
                <MetricRow
                  label="Total"
                  value={`${formatSolAmount(paymentMetrics.total + bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol, 2)} SOL`}
                />
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setTab('payments')}
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
              validator={validator}
            />

            {simEnabled && (
              <div className="rounded-xl border-2 p-5 border-status-yellow bg-status-yellow-light">
                <h3 className="text-base font-semibold flex items-center gap-2 text-status-yellow">
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
                        <span className="inline-block w-2 h-2 rounded-full bg-status-yellow animate-pulse" />
                        Recalculating…
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-status-green" />
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

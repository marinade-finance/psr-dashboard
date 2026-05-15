import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { BidPenaltyBreakdown } from 'src/components/breakdowns/bid-penalty'
import { BiddingBreakdown } from 'src/components/breakdowns/bidding'
import { BondCoverageBreakdown } from 'src/components/breakdowns/bond-coverage'
import { CalcCard } from 'src/components/breakdowns/card'
import { docsPath } from 'src/components/breakdowns/docs-path'
import { PaymentsBreakdown } from 'src/components/breakdowns/payments'
import { SEPARATOR_DIV_CLASS } from 'src/components/breakdowns/row'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { Switch } from 'src/components/ui/switch'
import { Tooltip } from 'src/components/ui/tooltip'
import { ApyCompositionCard } from 'src/components/validator-detail/apy-composition-card'
import {
  CSS_PRIMARY,
  CSS_DESTRUCTIVE,
  CSS_PRIMARY_LIGHT,
  CSS_DESTRUCTIVE_LIGHT,
  CSS_WARNING,
  CSS_MUTED_FG,
} from 'src/css'
import { cost, payCta, stake } from 'src/format'
import { computeBidPenalty } from 'src/services/bid-penalty'
import { computeBidding } from 'src/services/bidding'
import { computeBondCoverage } from 'src/services/bond-coverage'
import { bondHealthFromAuction } from 'src/services/bond-health'
import { HELP_TEXT } from 'src/services/help-text'
import { fetchPsrEstimatesForValidator } from 'src/services/protected-events-estimator'
import {
  selectExpectedStakeChange,
  selectMaxAPY,
  selectVoteAccount,
  selectWinningApyForValidator,
} from 'src/services/sam'
import {
  getApyBreakdown,
  getValidatorTip,
  getTipStyle,
} from 'src/services/tip-engine'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { BondCoverage } from 'src/services/bond-coverage'
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
  level?: UserLevel
}

type Tab =
  | 'overview'
  | 'notifications'
  | 'bond'
  | 'revenue'
  | 'penalty'
  | 'payments'

export type BondHealth = 'healthy' | 'soft' | 'watch' | 'critical'

export function bondCoverageLabel(
  health: BondHealth,
  coverage: BondCoverage,
): string {
  if (health === 'critical')
    return coverage.topUpToAvoidFee > 0
      ? `Top up ${payCta(coverage.topUpToAvoidFee)} to avoid the fee`
      : 'Critical'
  if (health === 'watch')
    return coverage.topUpToKeepStake > 0
      ? `Top up ${payCta(coverage.topUpToKeepStake)} to keep your stake`
      : 'Watch'
  if (health === 'soft')
    return coverage.topUpToIdealKeep > 0
      ? `Top up ${payCta(coverage.topUpToIdealKeep)} to qualify for more`
      : 'Adequate'
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
  onSeeBreakdown,
  separator,
}: {
  label: string
  help?: string
  value: React.ReactNode
  valueStyle?: React.CSSProperties
  onSeeBreakdown?: () => void
  separator?: boolean
}) => (
  <div
    className={cn(
      'flex items-center justify-between',
      separator && SEPARATOR_DIV_CLASS,
    )}
  >
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      {onSeeBreakdown ? (
        <Tooltip content="See calculation">
          <button
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
            onClick={onSeeBreakdown}
          >
            {label} →
          </button>
        </Tooltip>
      ) : (
        label
      )}
      {help && <HelpTip text={help} />}
    </span>
    <span className="text-sm font-semibold font-mono" style={valueStyle}>
      {value}
    </span>
  </div>
)

const PenaltyRow = ({
  label,
  value,
  onSeeBreakdown,
  sub,
}: {
  label: string
  value: string
  onSeeBreakdown: () => void
  sub?: boolean
}) => (
  <div className="flex items-center justify-between gap-2">
    <Tooltip content="See calculation">
      <button
        className={cn(
          'text-left flex-1',
          sub
            ? 'text-[10px] text-muted-foreground'
            : 'text-xs text-muted-foreground',
          'hover:text-foreground hover:underline',
        )}
        onClick={onSeeBreakdown}
      >
        {label} →
      </button>
    </Tooltip>
    <span
      className={cn('font-mono', sub ? 'text-[10px]' : 'text-sm font-semibold')}
      style={{ color: sub ? CSS_MUTED_FG : CSS_DESTRUCTIVE }}
    >
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
  rank: _rank,
  isSimulated = false,
  onClose,
  onSimulate,
  onClearSimulation,
  isCalculating,
  level,
}: ValidatorDetailProps) => {
  const voteAccount = selectVoteAccount(validator)
  const validatorName = nameMap?.get(voteAccount)?.name
  const notificationSummary = notificationsMap?.[voteAccount]
  const winningApy = selectWinningApyForValidator(
    validator,
    auctionResult,
    epochsPerYear,
  )
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
  const posVsWinning = useMemo(() => {
    const ourApy = selectMaxAPY(validator, epochsPerYear)
    let count = 0
    for (const other of auctionResult.auctionData.validators) {
      if (selectVoteAccount(other) === voteAccount) continue
      const otherInSet = other.auctionStake.marinadeSamTargetSol > 0
      const otherApy = selectMaxAPY(other, epochsPerYear)
      if (inSet && otherInSet && otherApy < ourApy) count++
      else if (!inSet && !otherInSet && otherApy > ourApy) count++
    }
    return inSet ? count : -count
  }, [auctionResult, validator, voteAccount, inSet, epochsPerYear])
  const bondCoverage = useMemo(
    () =>
      computeBondCoverage(
        validator,
        dsSamConfig.minBondEpochs,
        dsSamConfig.idealBondEpochs,
        winningTotalPmpe,
        dsSamConfig.bondRiskFeeMult,
      ),
    [
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      dsSamConfig.bondRiskFeeMult,
      winningTotalPmpe,
    ],
  )
  const paymentMetrics = useMemo(() => computeBidding(validator), [validator])
  const penaltyMetrics = useMemo(
    () => computeBidPenalty(validator, dsSamConfig, winningTotalPmpe),
    [
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.bondRiskFeeMult,
      winningTotalPmpe,
    ],
  )
  const { data: psrEstimates = [] } = useQuery({
    queryKey: ['psrEstimates', voteAccount],
    queryFn: () => fetchPsrEstimatesForValidator(voteAccount),
    staleTime: 5 * 60 * 1000,
  })

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
  // Caller passes a `key` keyed on the selected validator's vote account, so
  // each new validator mounts a fresh ValidatorDetail and this initialiser
  // re-runs. No mirror-prop-into-state useEffect needed.
  const [simEnabled, setSimEnabled] = useState(isSimulated)

  // Debounced auto-recalc whenever inputs change while simulation is enabled.
  // 400ms covers fast number-input arrow clicking without thrashing the SDK.
  // The parent's `onSimulate` callback identity churns every time the auction
  // re-runs (it closes over `data` and `simulationOverrides`). Routing it
  // through a ref keeps this effect's deps to the actual inputs only —
  // otherwise each settle re-schedules the timer and we loop forever.
  const firstRun = useRef(true)
  const onSimulateRef = useRef(onSimulate)
  useEffect(() => {
    onSimulateRef.current = onSimulate
  }, [onSimulate])
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
      onSimulateRef.current(
        !isNaN(inflationValue) ? inflationValue : null,
        mevValue,
        blockValue,
        !isNaN(bidValue) ? bidValue : null,
      )
    }, 400)
    return () => clearTimeout(t)
  }, [simEnabled, editBid, editInflation, editMev, editBlock])

  const handleSimToggle = (enabled: boolean) => {
    setSimEnabled(enabled)
    firstRun.current = true
    if (enabled) setTab('overview')
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
        title="Validator detail"
        className={cn(
          'w-full max-w-4xl overflow-y-auto p-0',
          isSimulated && 'border-t-4 border-t-status-yellow',
        )}
      >
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 border-b border-border sticky top-0 z-10 gap-2 bg-background">
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
                  {posVsWinning < 0
                    ? `-#${Math.abs(posVsWinning)}`
                    : `#${posVsWinning}`}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {inSet
                    ? posVsWinning === 0
                      ? 'at winning edge'
                      : `${posVsWinning} ${posVsWinning === 1 ? 'place' : 'places'} above winning`
                    : `${Math.abs(posVsWinning)} ${Math.abs(posVsWinning) === 1 ? 'place' : 'places'} below winning`}
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
                <Tooltip content="Numbers shown here use your what-if commission and bid, not the live values.">
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 uppercase tracking-wide bg-status-yellow-light text-status-yellow">
                    Simulated
                  </span>
                </Tooltip>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground break-all leading-tight">
              {voteAccount}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content="Turn this on to see how changing your commission or bid would shift your rank — updates as you type.">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <span className="text-muted-foreground">Simulate</span>
                <Switch
                  checked={simEnabled}
                  onCheckedChange={handleSimToggle}
                  aria-label="Toggle simulation mode"
                />
              </label>
            </Tooltip>
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
              className={cn(
                'px-4 sm:px-6 py-3 flex items-center gap-3',
                tipTarget && 'cursor-pointer select-none',
              )}
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

        {(() => {
          const goToSim = () => {
            setSimEnabled(true)
            setTab('overview')
          }
          // Tabs no longer render a tab-level title or Guide link.
          // Uniformity is at the card level: each card inside the body
          // owns its own title + Guide chrome via CalcCard. The Overview
          // tab is a multi-card grid where every sub-card uses CalcCard.
          const TAB_DEFS: ReadonlyArray<{ id: Tab; label: string }> = [
            { id: 'overview', label: 'Overview' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'payments', label: 'Payments' },
            { id: 'revenue', label: 'Bidding' },
            { id: 'bond', label: 'Bond' },
            { id: 'penalty', label: 'Bid Penalty' },
          ]

          return (
            <>
              <div className="border-b border-border bg-background sticky top-[68px] z-[5]">
                <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto">
                  {TAB_DEFS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        'px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
                        tab === t.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'bond' && (
                <div className="p-4 sm:p-6">
                  <BondCoverageBreakdown
                    title="Bond Calculation"
                    guideTo={`${docsPath(level)}#bond`}
                    validator={validator}
                    dsSamConfig={dsSamConfig}
                    winningTotalPmpe={winningTotalPmpe}
                    bondState={bondHealth}
                    bondRiskFeeSol={bondRiskFeeSol}
                    isSimulated={isSimulated}
                    onGoToSim={goToSim}
                  />
                </div>
              )}
              {tab === 'payments' && (
                <div className="p-4 sm:p-6 space-y-6">
                  <PaymentsBreakdown
                    title="Payments Calculation"
                    guideTo={`${docsPath(level)}#detail-panel`}
                    validator={validator}
                    dsSamConfig={dsSamConfig}
                    winningTotalPmpe={winningTotalPmpe}
                    bondRiskFeeSol={bondRiskFeeSol}
                    blacklistPenaltySol={blacklistPenaltySol}
                    bidTooLowPenaltySol={bidTooLowPenaltySol}
                    psrEstimates={psrEstimates}
                    isSimulated={isSimulated}
                    onGoToSim={goToSim}
                    onGoToPenalty={() => setTab('penalty')}
                  />
                </div>
              )}
              {tab === 'revenue' && (
                <div className="p-4 sm:p-6">
                  <BiddingBreakdown
                    title="Bidding Calculation"
                    guideTo={`${docsPath(level)}#cpmpe`}
                    validator={validator}
                    isSimulated={isSimulated}
                    onGoToSim={goToSim}
                  />
                </div>
              )}
              {tab === 'penalty' && (
                <div className="p-4 sm:p-6">
                  <BidPenaltyBreakdown
                    title="Bid Penalty Calculation"
                    guideTo={`${docsPath(level)}#bid-penalty`}
                    validator={validator}
                    dsSamConfig={dsSamConfig}
                    winningTotalPmpe={winningTotalPmpe}
                    isSimulated={isSimulated}
                    onGoToSim={goToSim}
                  />
                </div>
              )}

              {tab === 'notifications' && (
                <div className="p-4 sm:p-6">
                  <CalcCard
                    title="Notifications"
                    guideTo={`${docsPath(level)}#detail-panel`}
                    isSimulated={isSimulated}
                  >
                    {notificationSummary?.notifications?.length ? (
                      <div className="space-y-4">
                        {notificationSummary.notifications.map(notification => {
                          const tone =
                            notification.priority === 'critical'
                              ? 'bg-destructive-light text-destructive'
                              : notification.priority === 'warning'
                                ? 'bg-warning-light text-warning'
                                : 'bg-info-light text-info'
                          return (
                            <div
                              key={notification.id}
                              className="border-t border-border first:border-t-0 first:pt-0 pt-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide',
                                    tone,
                                  )}
                                >
                                  {notification.priority}
                                </span>
                                {notification.title && (
                                  <span className="text-sm font-semibold text-foreground">
                                    {notification.title}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-pre-line">
                                {notification.body}
                              </div>
                              {notification.footer && (
                                <div className="text-[10px] text-muted-foreground italic mt-1.5">
                                  {notification.footer}
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
                  </CalcCard>
                </div>
              )}
            </>
          )
        })()}

        <div
          className={cn(
            'grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-6 pb-6',
            tab !== 'overview' && 'hidden',
          )}
        >
          <div className="space-y-6">
            <CalcCard
              title="Stake"
              guideTo={`${docsPath(level)}#detail-panel`}
              isSimulated={isSimulated}
            >
              <div className="space-y-3">
                <MetricRow
                  label="Active Marinade stake"
                  help="How much SOL Marinade has staked with you right now."
                  value={stake(validator.marinadeActivatedStakeSol)}
                />
                <MetricRow
                  label="Target Marinade stake"
                  help="How much stake the auction decided you should have this epoch, based on your bid and how you scored."
                  value={stake(validator.auctionStake.marinadeSamTargetSol)}
                />
                <MetricRow
                  label="Expected change next epoch"
                  help="Stake you'll gain or lose next epoch. Losses mostly come from falling out of the auction (your bid was too low or the bond was thin). A small share comes from people pulling SOL out of Marinade — that comes out of every validator proportionally."
                  value={
                    expectedStakeDelta > 0
                      ? `+${stake(expectedStakeDelta)}`
                      : expectedStakeDelta < 0
                        ? stake(expectedStakeDelta)
                        : stake(0)
                  }
                  separator
                />
              </div>
            </CalcCard>

            <CalcCard
              title="Bond"
              guideTo={`${docsPath(level)}#bond`}
              isSimulated={isSimulated}
              onTitleClick={() => setTab('bond')}
            >
              <div className="space-y-3">
                <MetricRow
                  label="Balance"
                  value={stake(validator.bondBalanceSol ?? 0)}
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
              </div>
            </CalcCard>

            <CalcCard
              title="Expected Payment This Epoch"
              guideTo={`${docsPath(level)}#detail-panel`}
              isSimulated={isSimulated}
              onTitleClick={() => setTab('payments')}
            >
              <div className="space-y-3">
                <MetricRow
                  label="Active Stake Cost"
                  value={cost(paymentMetrics.cost)}
                />
                <MetricRow
                  label="Activating Stake Cost"
                  value={cost(paymentMetrics.activatingCost)}
                />
                {(() => {
                  const penaltyTotal =
                    bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol
                  if (penaltyTotal === 0) {
                    return <MetricRow label="Penalty" value="No penalties" />
                  }
                  return (
                    <MetricRow
                      label="Penalty"
                      value={cost(penaltyTotal)}
                      valueStyle={{ color: CSS_DESTRUCTIVE }}
                    />
                  )
                })()}
                {bidTooLowPenaltySol > 0 && (
                  <PenaltyRow
                    label="↳ bid-too-low penalty"
                    value={cost(bidTooLowPenaltySol)}
                    onSeeBreakdown={() => setTab('penalty')}
                    sub
                  />
                )}
                {blacklistPenaltySol > 0 && (
                  <PenaltyRow
                    label="↳ blacklist penalty"
                    value={cost(blacklistPenaltySol)}
                    onSeeBreakdown={() => setTab('payments')}
                    sub
                  />
                )}
                {bondRiskFeeSol > 0 && (
                  <PenaltyRow
                    label="↳ bond risk fee"
                    value={cost(bondRiskFeeSol)}
                    onSeeBreakdown={() => setTab('bond')}
                    sub
                  />
                )}
                <MetricRow
                  label="Total"
                  value={cost(
                    paymentMetrics.total +
                      bidTooLowPenaltySol +
                      blacklistPenaltySol +
                      bondRiskFeeSol,
                  )}
                  onSeeBreakdown={() => setTab('payments')}
                  separator
                />
              </div>
            </CalcCard>
          </div>

          <div className="space-y-6">
            <ApyCompositionCard
              apyBreakdown={apyBreakdown}
              winningApy={winningApy}
              validator={validator}
              guideTo={`${docsPath(level)}#detail-panel`}
              isSimulated={isSimulated}
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

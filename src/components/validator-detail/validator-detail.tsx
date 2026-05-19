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
  CSS_STATUS_GREEN,
  CSS_WARNING,
  CSS_MUTED_FG,
} from 'src/css'
import { cost, topUp, stake } from 'src/format'
import {
  bidTooLowPenaltySol as computeBidTooLowPenaltySol,
  blacklistPenaltySol as computeBlacklistPenaltySol,
} from 'src/services/bid-penalty'
import { computeBidding } from 'src/services/bidding'
import { computeBondCoverage } from 'src/services/bond-coverage'
import { bondHealthFromAuction } from 'src/services/bond-health'
import { effectiveBondRunway } from 'src/services/calculations'
import { HELP_TEXT } from 'src/services/help-text'
import { fetchPsrEstimatesForValidator } from 'src/services/protected-events-estimator'
import {
  selectExpectedStakeChange,
  selectInSet,
  selectVoteAccount,
  selectWinningApyForValidator,
} from 'src/services/sam'
import {
  getApyBreakdown,
  getBondAdviceStyle,
  getValidatorTip,
  getTipStyle,
  getTipIcon,
} from 'src/services/tip-engine'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { BondCoverage } from 'src/services/bond-coverage'
import type { BondHealthState } from 'src/services/bond-health'
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
  | 'payments'
  | 'bidding'
  | 'bond'
  | 'penalty'

const TAB_DEFS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'payments', label: 'Payments' },
  { id: 'bidding', label: 'Bidding' },
  { id: 'bond', label: 'Bond' },
  { id: 'penalty', label: 'Bid Penalty' },
]

// Attention cue on a tab whose content needs a look. It persists on the
// active tab too — pulsing — so opening the tab doesn't erase the signal
// while the issue is unresolved. One tone axis, shared with the
// status/intent families — never a new colour.
type AttentionTone = 'critical' | 'warning' | 'info'

const ATTENTION_DOT: Record<AttentionTone, string> = {
  critical: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
}

const ATTENTION_TEXT: Record<AttentionTone, string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
}

function TabStrip({
  tab,
  setTab,
  attention,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  attention: Partial<Record<Tab, AttentionTone>>
}) {
  return (
    <div className="border-b border-border bg-background sticky top-[68px] z-[5]">
      <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto">
        {TAB_DEFS.map(t => {
          const tone = attention[t.id]
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
                active
                  ? 'border-primary text-primary'
                  : tone
                    ? cn(
                        'border-transparent hover:text-foreground',
                        ATTENTION_TEXT[tone],
                      )
                    : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tone && (
                <span
                  aria-hidden
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    ATTENTION_DOT[tone],
                    active && 'animate-pulse',
                  )}
                />
              )}
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Per-tab attention tones. Each trigger reuses an existing severity source —
// bond from bondHealthFromAuction, penalty from the breakdown's penaltySol,
// notifications from the summary the panel already receives — plus a subtle
// info hint on the tab the header tip points at. No new colour or fetch.
function tabAttention(args: {
  bondHealth: BondHealthState
  bidPenaltySol: number
  notes: ReadonlyArray<{ priority: 'critical' | 'warning' | 'info' }>
  tipConstraint: string
}): Partial<Record<Tab, AttentionTone>> {
  const { bondHealth, bidPenaltySol, notes, tipConstraint } = args
  const notifTone: AttentionTone | undefined = notes.some(
    n => n.priority === 'critical',
  )
    ? 'critical'
    : notes.some(n => n.priority === 'warning')
      ? 'warning'
      : notes.length > 0
        ? 'info'
        : undefined
  const attention: Partial<Record<Tab, AttentionTone>> = {}
  if (
    bondHealth === 'critical' ||
    bondHealth === 'no-bond' ||
    bondHealth === 'watch'
  ) {
    attention.bond = bondHealth === 'watch' ? 'warning' : 'critical'
  }
  if (bidPenaltySol > 0) attention.penalty = 'critical'
  if (notifTone) attention.notifications = notifTone
  const tipTab: Tab | null =
    tipConstraint === 'bond'
      ? 'bond'
      : tipConstraint === 'bid'
        ? 'bidding'
        : null
  if (tipTab && !attention[tipTab]) attention[tipTab] = 'info'
  return attention
}

export function bondCoverageLabel(
  health: BondHealthState,
  coverage: BondCoverage,
): string {
  if (health === 'no-bond') return 'No bond'
  if (health === 'critical')
    return coverage.topUpToAvoidFee > 0
      ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the fee`
      : 'Critical'
  if (health === 'watch')
    return coverage.topUpToKeepStake > 0
      ? `Top up ${topUp(coverage.topUpToKeepStake)} to keep your stake`
      : 'Watch'
  if (health === 'soft')
    return coverage.topUpToIdealKeep > 0
      ? `Top up ${topUp(coverage.topUpToIdealKeep)} to grow stake`
      : 'Adequate'
  return 'Fully covered'
}

function bondCoverageColor(health: BondHealthState): string {
  if (health === 'no-bond') return CSS_DESTRUCTIVE
  if (health === 'critical') return CSS_DESTRUCTIVE
  if (health === 'watch') return CSS_WARNING
  if (health === 'soft') return CSS_MUTED_FG
  return CSS_PRIMARY
}

const MetricRow = ({
  label,
  help,
  helpGuideTo,
  value,
  valueStyle,
  onSeeBreakdown,
  separator,
}: {
  label: string
  help?: string
  helpGuideTo?: string
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
        <>
          <span>{label}</span>
          <button
            className="text-xs text-primary hover:underline"
            onClick={onSeeBreakdown}
          >
            Show calculation →
          </button>
        </>
      ) : (
        label
      )}
      {help && <HelpTip text={help} guideTo={helpGuideTo} />}
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
    <span
      className={cn(
        'text-left flex-1 flex items-center gap-2',
        sub ? 'text-[10px]' : 'text-xs',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <button className="text-primary hover:underline" onClick={onSeeBreakdown}>
        Show calculation →
      </button>
    </span>
    <span
      className={cn('font-mono', sub ? 'text-[10px]' : 'text-sm font-semibold')}
      style={{ color: sub ? CSS_MUTED_FG : CSS_DESTRUCTIVE }}
    >
      {value}
    </span>
  </div>
)

/* eslint-disable sonarjs/cognitive-complexity --
   The component composes tabs + simulation state + tip routing.
   Splitting into helpers fragments the props plumbing without reducing
   real complexity, so the rule is silenced for this function. */
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
  const bondHealth = bondHealthFromAuction(
    validator,
    dsSamConfig,
    winningTotalPmpe,
  )
  // A no-bond or below-minimum bond sustains zero stake regardless of the
  // SDK's raw bondGoodForNEpochs, which ignores the below-min gate. Force
  // the runway to Depleted so Balance, Reserve and Bid runway tell one
  // coherent story instead of "0 SOL / Critical / 6 epochs".
  const bondRunway = effectiveBondRunway(validator, bondHealth)
  const tip = getValidatorTip(validator, dsSamConfig, winningTotalPmpe)
  const tipStyle = getTipStyle(tip.urgency)
  const expectedStakeDelta = selectExpectedStakeChange(validator)
  const [tab, setTab] = useState<Tab>('overview')

  const inSet = selectInSet(validator)
  // Dense rank around the winning cutoff: 0 at cutoff, +N at the Nth distinct
  // APY tier above, −N below. Computed once in sam.ts; consistent with the
  // rank cell in sam-table.
  const posVsWinning = validator.values.cutoffRank ?? 0
  const bondCoverage = useMemo(
    () => computeBondCoverage(validator, dsSamConfig, winningTotalPmpe),
    [validator, dsSamConfig, winningTotalPmpe],
  )
  const paymentMetrics = useMemo(() => computeBidding(validator), [validator])
  const { data: psrEstimates = [] } = useQuery({
    queryKey: ['psrEstimates', voteAccount],
    queryFn: () => fetchPsrEstimatesForValidator(voteAccount),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'payments',
  })

  const bondRiskFeeSol = validator.values.bondRiskFeeSol ?? 0
  const blacklistPenaltySol = computeBlacklistPenaltySol(validator)
  const bidTooLowPenaltySol = computeBidTooLowPenaltySol(validator)

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

  const goToSim = () => {
    setSimEnabled(true)
    setTab('overview')
  }

  // Banner — see the bond-tip / tip-style discussion below.
  const isBondTip = tip.constraint === 'bond'
  const bannerStyle = isBondTip ? getBondAdviceStyle(bondHealth) : tipStyle
  const tipTarget: Tab | null = isBondTip
    ? 'bond'
    : tip.constraint === 'bid'
      ? 'overview'
      : null

  const attention = tabAttention({
    bondHealth,
    bidPenaltySol: bidTooLowPenaltySol,
    notes: notificationSummary?.notifications ?? [],
    tipConstraint: tip.constraint,
  })

  const penaltyTotal =
    bidTooLowPenaltySol + blacklistPenaltySol + bondRiskFeeSol
  const bondBalance = validator.bondBalanceSol ?? 0
  // A tiny positive bond drives Critical but rounds to "0 SOL" under
  // whole-SOL stake() — reads as no bond and contradicts the Critical
  // reserve. Show 3-decimal cost() precision for sub-1 SOL balances so
  // the row is honest.
  const bondBalanceDisplay =
    bondBalance > 0 && bondBalance < 1 ? cost(bondBalance) : stake(bondBalance)

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
                    {getTipIcon(tip)}
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
                <span className="text-lg font-semibold text-foreground">
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
              <Tooltip content="Removes only this validator from simulation. To clear every simulated validator, use Reset Simulation on the main table.">
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/5"
                  onClick={onClearSimulation}
                  disabled={isCalculating}
                >
                  Remove from simulation
                </Button>
              </Tooltip>
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

        <div
          className={cn(
            'px-4 sm:px-6 py-3 flex items-center gap-3',
            tipTarget && 'cursor-pointer select-none',
          )}
          style={{ background: bannerStyle.bg }}
          onClick={tipTarget ? () => setTab(tipTarget) : undefined}
        >
          <span
            className="text-sm font-medium flex-1"
            style={{ color: bannerStyle.color }}
          >
            {tip.text}
          </span>
          {tipTarget && (
            <span
              className="text-xs font-medium shrink-0 px-2 py-0.5 rounded border whitespace-nowrap bg-card/55"
              style={{
                color: bannerStyle.color,
                borderColor: bannerStyle.color,
              }}
            >
              {isBondTip ? 'Bond tab →' : 'Simulate →'}
            </span>
          )}
        </div>

        {/*
          Tabs no longer render a tab-level title or Guide link.
          Uniformity is at the card level: each card inside the body
          owns its own title + Guide chrome via CalcCard. The Overview
          tab is a multi-card grid where every sub-card uses CalcCard.
        */}
        <>
          <TabStrip tab={tab} setTab={setTab} attention={attention} />

          {tab === 'bond' && (
            <div className="p-4 sm:p-6">
              <BondCoverageBreakdown
                title="Bond calculation"
                guideTo={`${docsPath(level)}#bond`}
                coverage={bondCoverage}
                bondState={bondHealth}
                bondRiskFeeSol={bondRiskFeeSol}
                bondBalanceSol={validator.bondBalanceSol ?? 0}
                minBondBalanceSol={dsSamConfig.minBondBalanceSol}
                expectedStakeDeltaSol={expectedStakeDelta}
                isSimulated={isSimulated}
                onGoToSim={goToSim}
              />
            </div>
          )}
          {tab === 'bidding' && (
            <div className="p-4 sm:p-6">
              <BiddingBreakdown
                title="Bidding"
                guideTo={`${docsPath(level)}#bidding`}
                validator={validator}
                auctionResult={auctionResult}
                winningTotalPmpe={winningTotalPmpe}
                coverage={bondCoverage}
                isSimulated={isSimulated}
                onGoToSim={goToSim}
              />
            </div>
          )}
          {tab === 'payments' && (
            <div className="p-4 sm:p-6">
              <PaymentsBreakdown
                title="Payments"
                guideTo={`${docsPath(level)}#payments`}
                validator={validator}
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
          {tab === 'penalty' && (
            <div className="p-4 sm:p-6">
              <BidPenaltyBreakdown
                title="Bid penalty calculation"
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

        <div
          className={cn(
            'grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-6 py-6',
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
                  help="Stake you'll gain or lose next epoch. Losses mostly come from falling out of the auction — your bid was too low or the bond was thin. A small share comes from people pulling SOL out of Marinade, taken from every validator proportionally. It can read 0 SOL even when your target stake is above your active stake — the redelegation budget went to higher-priority validators first, or you are cap or bond constrained, so no net inflow is expected."
                  value={
                    expectedStakeDelta > 0
                      ? `+${stake(expectedStakeDelta)}`
                      : expectedStakeDelta < 0
                        ? stake(expectedStakeDelta)
                        : stake(0)
                  }
                  valueStyle={{
                    color:
                      expectedStakeDelta > 0
                        ? CSS_STATUS_GREEN
                        : expectedStakeDelta < 0
                          ? CSS_DESTRUCTIVE
                          : undefined,
                  }}
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
                <MetricRow label="Balance" value={bondBalanceDisplay} />
                <MetricRow
                  label="Reserve"
                  help={HELP_TEXT.bondCoverage}
                  helpGuideTo={`${docsPath(level)}#bond`}
                  value={bondCoverageLabel(bondHealth, bondCoverage)}
                  valueStyle={{ color: bondCoverageColor(bondHealth) }}
                />
                <MetricRow
                  label="Bid runway"
                  help={HELP_TEXT.bondRunway}
                  helpGuideTo={`${docsPath(level)}#bond-risk-fee`}
                  value={
                    bondRunway <= 0
                      ? 'Depleted'
                      : `${Math.round(bondRunway)} epochs`
                  }
                />
              </div>
            </CalcCard>

            <CalcCard
              title="Payments"
              guideTo={`${docsPath(level)}#detail-panel`}
              isSimulated={isSimulated}
              onTitleClick={() => setTab('payments')}
            >
              <div className="space-y-3">
                <MetricRow
                  label="Active stake cost"
                  value={cost(paymentMetrics.cost)}
                />
                <MetricRow
                  label="Activating stake cost"
                  value={cost(paymentMetrics.activatingCost)}
                />
                {penaltyTotal === 0 ? (
                  <MetricRow label="Penalty" value="No penalties" />
                ) : (
                  <MetricRow
                    label="Penalty"
                    value={cost(penaltyTotal)}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                  />
                )}
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
                  label="Expected payment this epoch"
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
              guideTo={`${docsPath(level)}#cpmpe`}
              isSimulated={isSimulated}
              onGoToBidding={() => setTab('bidding')}
            />

            {simEnabled && (
              <div className="rounded-xl border border-status-yellow p-5 bg-status-yellow-light">
                <h3 className="text-base font-semibold flex items-center gap-2 text-status-yellow">
                  <HelpTip
                    text={HELP_TEXT.simulation}
                    guideTo={`${docsPath(level)}#simulation`}
                  >
                    What-If Simulation
                  </HelpTip>
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

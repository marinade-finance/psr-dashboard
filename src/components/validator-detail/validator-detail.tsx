import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { BidPenaltyBreakdown } from 'src/components/breakdowns/bid-penalty'
import { BiddingBreakdown } from 'src/components/breakdowns/bidding'
import { BondCoverageBreakdown } from 'src/components/breakdowns/bond-coverage'
import {
  CalcCard,
  StatusBanner,
  tipBannerTone,
} from 'src/components/breakdowns/card'
import { docsPath } from 'src/components/breakdowns/docs-path'
import { PaymentsBreakdown } from 'src/components/breakdowns/payments'
import { SEPARATOR_DIV_CLASS } from 'src/components/breakdowns/row'
import { HelpTip } from 'src/components/help-tip/help-tip'
import { ICON_CHEVRON_LEFT_SM } from 'src/components/icons/icon-chevron-left'
import { TIP_ICONS } from 'src/components/icons/tip-icons'
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
import { cost, pay, topUp, stake, signedStake } from 'src/format'
import {
  bidTooLowPenaltySol as computeBidTooLowPenaltySol,
  blacklistPenaltySol as computeBlacklistPenaltySol,
} from 'src/services/bid-penalty'
import { computeBidding } from 'src/services/bidding'
import { computeBondCoverage } from 'src/services/bond-coverage'
import { bondHealthFromAuction } from 'src/services/bond-health'

import type { BondHealthState } from 'src/services/bond-health'
import { effectiveBondRunway } from 'src/services/bond-health'
import { HELP_TEXT } from 'src/services/help-text'
import { computePaymentTotal } from 'src/services/payment-total'
import { calculateProtectedEventEstimates } from 'src/services/protected-events-estimator'
import {
  selectExpectedStakeChange,
  selectInSet,
  selectRedelegationPriorityFrontierPmpe,
  selectVoteAccount,
  selectWinningApyForValidator,
} from 'src/services/sam'
import {
  bondAdvice,
  getApyBreakdown,
  getValidatorTip,
  getTipStyle,
  getTipIcon,
} from 'src/services/tip-engine'
import { fetchValidatorsWithEpochs } from 'src/services/validators'
import { assertNever } from 'src/utils/assert-never'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { BondCoverage } from 'src/services/bond-coverage'
import type {
  NotificationPriority,
  NotificationSummary,
} from 'src/services/notifications'
import type { AugmentedAuctionValidator } from 'src/services/sam'
import type { TipConstraint } from 'src/services/tip-engine'

interface ValidatorDetailProps {
  validator: AugmentedAuctionValidator
  auctionResult: AuctionResult
  originalAuctionResult?: AuctionResult | null
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
    bondBalanceSol: number | null,
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
// while the issue is unresolved. Same three-level axis as
// NotificationPriority; aliased so the two stay aligned.
type AttentionTone = NotificationPriority

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

// Single source for "which tab does this lever live on". Used both by the
// tab-strip dot in tabAttention and by the header banner's click target —
// keeps both surfaces in lockstep. Record<TipConstraint, Tab|null> forces
// an explicit mapping for every union member (a new lever fails the build
// until added). 'bid' = in-set penalty → Penalty tab (the math lives
// there); 'rank' = out-of-set → Bidding tab (raise the static bid);
// 'cap'/'none' have no dedicated tab (explanation lives in the header).
const TIP_TAB: Record<TipConstraint, Tab | null> = {
  bond: 'bond',
  bid: 'penalty',
  rank: 'bidding',
  cap: null,
  none: null,
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
      <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TAB_DEFS.map(t => {
          const tone = attention[t.id]
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2.5 text-mid font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
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
  notes: ReadonlyArray<{ priority: NotificationPriority }>
  tipConstraint: TipConstraint
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
  if (bondHealth === 'critical' || bondHealth === 'no-bond') {
    attention.bond = 'critical'
  } else if (bondHealth === 'watch') {
    attention.bond = 'warning'
  }
  if (bidPenaltySol > 0) attention.penalty = 'critical'
  if (notifTone) attention.notifications = notifTone
  const tipTab = TIP_TAB[tipConstraint]
  if (tipTab && !attention[tipTab]) attention[tipTab] = 'info'
  return attention
}

function bondCoverageLabel(
  health: BondHealthState,
  coverage: BondCoverage,
  expectedStakeDeltaSol = 0,
): string {
  switch (health) {
    case 'no-bond':
      return 'No bond'
    case 'critical':
      if (coverage.bondRiskFeeShortfall > 0)
        return `Top up ${topUp(coverage.bondRiskFeeShortfall)} to avoid the fee`
      if (coverage.topUpToKeepStake > 0)
        return `Top up ${topUp(coverage.topUpToKeepStake)} to keep stake`
      if (coverage.topUpToIdealKeep > 0)
        return `Top up ${topUp(coverage.topUpToIdealKeep)} to extend runway`
      return 'Critical'
    case 'watch':
      // Route through bondAdvice — the canonical CTA source — strip trailing period.
      // WATCH implies bondRiskFeeSol=0 (fee→CRITICAL) and above minBondBalance (below-min→CRITICAL).
      if (
        coverage.topUpToKeepStake > 0 ||
        (coverage.topUpToIdealKeep > 0 && expectedStakeDeltaSol <= 0)
      ) {
        return bondAdvice(
          coverage,
          'watch',
          0,
          0,
          coverage.bondBalanceSol,
          coverage.marinadeActivatedStakeSol,
        ).text.replace(/\.$/, '')
      }
      return 'Watch'
    case 'healthy':
      return 'Healthy'
    default:
      return assertNever(health)
  }
}

function bondCoverageColor(health: BondHealthState): string {
  switch (health) {
    case 'no-bond':
    case 'critical':
      return CSS_DESTRUCTIVE
    case 'watch':
      return CSS_WARNING
    case 'healthy':
      return CSS_PRIMARY
    default:
      return assertNever(health)
  }
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
}) => {
  const clickable = !!onSeeBreakdown
  const handleRowClick: React.MouseEventHandler = e => {
    if (!onSeeBreakdown) return
    // Don't hijack a HelpTip click or a focused text selection.
    if ((e.target as HTMLElement).closest('[role="tooltip"], button')) return
    onSeeBreakdown()
  }
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md',
        clickable && 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5',
        separator && SEPARATOR_DIV_CLASS,
      )}
      onClick={handleRowClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <span className="text-xs text-muted-foreground flex items-center gap-2 min-w-0">
        <span
          className={cn('truncate', clickable && 'hover:underline')}
          title={clickable ? 'Show calculation' : undefined}
        >
          {label}
        </span>
        {help && <HelpTip text={help} guideTo={helpGuideTo} />}
      </span>
      <span className="text-sm font-semibold font-mono" style={valueStyle}>
        {value}
      </span>
    </div>
  )
}

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
  <div
    className="flex items-center justify-between gap-2 rounded-md cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5"
    role="button"
    tabIndex={0}
    onClick={e => {
      if ((e.target as HTMLElement).closest('button')) return
      onSeeBreakdown()
    }}
  >
    <span
      className={cn(
        'text-muted-foreground text-left flex items-center gap-2 min-w-0',
        sub ? 'text-mid' : 'text-xs',
      )}
    >
      <span className="truncate hover:underline" title="Show calculation">
        {label}
      </span>
    </span>
    <span
      className={cn('font-mono', sub ? 'text-mid' : 'text-sm font-semibold')}
      style={{ color: sub ? CSS_MUTED_FG : CSS_DESTRUCTIVE }}
    >
      {value}
    </span>
  </div>
)

// What-changes block inside the sim panel: shows before → after pairs for
// values that actually moved. Skips when there's no baseline.
function SimDeltas({
  voteAccount,
  current,
  originalAuctionResult,
  dsSamConfig,
  winningTotalPmpe,
}: {
  voteAccount: string
  current: AugmentedAuctionValidator
  originalAuctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
}) {
  const original = originalAuctionResult.auctionData.validators.find(
    v => v.voteAccount === voteAccount,
  )
  if (!original) return null
  const origWinningTotalPmpe = originalAuctionResult.winningTotalPmpe

  const runwayBefore = effectiveBondRunway(original, dsSamConfig)
  const runwayAfter = effectiveBondRunway(current, dsSamConfig)
  const inSetBefore = selectInSet(original)
  const inSetAfter = selectInSet(current)
  const stakeBefore = original.auctionStake.marinadeSamTargetSol
  const stakeAfter = current.auctionStake.marinadeSamTargetSol
  // bondRiskFeeSol is pinned from the scoring API and never changes in
  // simulation. Track bondRiskFeeShortfall instead — it changes when
  // simulated stake shifts the fee floor.
  const shortfallBefore = computeBondCoverage(
    original,
    dsSamConfig,
    origWinningTotalPmpe,
  ).bondRiskFeeShortfall
  const shortfallAfter = computeBondCoverage(
    current,
    dsSamConfig,
    winningTotalPmpe,
  ).bondRiskFeeShortfall
  const penaltyBefore = computeBidTooLowPenaltySol(
    original,
    dsSamConfig,
    origWinningTotalPmpe,
  )
  const penaltyAfter = computeBidTooLowPenaltySol(
    current,
    dsSamConfig,
    winningTotalPmpe,
  )

  const rows: Array<{ label: string; node: React.ReactNode }> = []

  if (Math.round(runwayBefore) !== Math.round(runwayAfter)) {
    const up = runwayAfter > runwayBefore
    const colour = up ? CSS_STATUS_GREEN : CSS_DESTRUCTIVE
    const fmt = (n: number) => (n <= 0 ? 'Depleted' : `${Math.round(n)}ep`)
    rows.push({
      label: 'Bond runway',
      node: (
        <span className="font-mono" style={{ color: colour }}>
          {fmt(runwayBefore)} → {fmt(runwayAfter)}
        </span>
      ),
    })
  }
  if (inSetBefore !== inSetAfter) {
    rows.push({
      label: 'Status',
      node: (
        <span
          className="font-mono"
          style={{ color: inSetAfter ? CSS_STATUS_GREEN : CSS_DESTRUCTIVE }}
        >
          {inSetBefore ? 'In set' : 'Out of set'} →{' '}
          {inSetAfter ? 'In set' : 'Out of set'}
        </span>
      ),
    })
  }
  const stakeDelta = stakeAfter - stakeBefore
  if (Math.abs(stakeDelta) > 1) {
    rows.push({
      label: 'Stake target',
      node: (
        <span
          className="font-mono"
          style={{
            color: stakeDelta > 0 ? CSS_STATUS_GREEN : CSS_DESTRUCTIVE,
          }}
        >
          {signedStake(stakeDelta)}
        </span>
      ),
    })
  }
  const shortfallDelta = shortfallAfter - shortfallBefore
  if (Math.abs(shortfallDelta) > 1e-6) {
    rows.push({
      label: 'Fee shortfall',
      node: (
        <span
          className="font-mono"
          style={{
            color: shortfallDelta > 0 ? CSS_DESTRUCTIVE : CSS_STATUS_GREEN,
          }}
        >
          {shortfallDelta > 0 ? '+' : '−'}
          {cost(Math.abs(shortfallDelta))}
        </span>
      ),
    })
  }
  const penaltyDelta = penaltyAfter - penaltyBefore
  if (Math.abs(penaltyDelta) > 1e-6) {
    rows.push({
      label: 'Bid-too-low penalty',
      node: (
        <span
          className="font-mono"
          style={{
            color: penaltyDelta > 0 ? CSS_DESTRUCTIVE : CSS_STATUS_GREEN,
          }}
        >
          {penaltyDelta > 0 ? '+' : '−'}
          {cost(Math.abs(penaltyDelta))}
        </span>
      ),
    })
  }

  if (rows.length === 0) return null
  return (
    <div className="mt-4 rounded-md border border-status-yellow/40 bg-background p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        What changes
      </div>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div
            key={r.label}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-muted-foreground">{r.label}</span>
            {r.node}
          </div>
        ))}
      </div>
    </div>
  )
}

export const ValidatorDetail = ({
  validator,
  auctionResult,
  originalAuctionResult,
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
  const bondRunway = effectiveBondRunway(validator, dsSamConfig)
  const tip = getValidatorTip(
    validator,
    dsSamConfig,
    winningTotalPmpe,
    undefined,
    auctionResult.auctionData.blacklist,
    selectRedelegationPriorityFrontierPmpe(auctionResult),
  )
  const tipStyle = getTipStyle(tip.urgency)
  const expectedStakeDelta = selectExpectedStakeChange(validator)
  const [tab, setTab] = useState<Tab>('overview')

  const inSet = selectInSet(validator)
  // Dense rank around the winning cutoff: 0 at cutoff, +N above, −N below.
  const posVsWinning = validator.values.cutoffRank
  const bondCoverage = useMemo(
    () => computeBondCoverage(validator, dsSamConfig, winningTotalPmpe),
    [validator, dsSamConfig, winningTotalPmpe],
  )
  const paymentMetrics = useMemo(() => computeBidding(validator), [validator])
  const queryClient = useQueryClient()
  const { data: allPsrEstimates = [] } = useQuery({
    queryKey: ['psr-estimates-all'],
    queryFn: async ({ signal }) => {
      const { validators } = await queryClient.ensureQueryData({
        queryKey: ['validators-with-epochs', 3],
        queryFn: (ctx: { signal: AbortSignal }) =>
          fetchValidatorsWithEpochs(3, ctx.signal),
      })
      return calculateProtectedEventEstimates(validators, signal)
    },
    enabled: tab === 'payments',
  })
  const psrEstimates = useMemo(
    () => allPsrEstimates.filter(e => e.vote_account === voteAccount),
    [allPsrEstimates, voteAccount],
  )

  const bondRiskFeeSol = validator.values.bondRiskFeeSol ?? 0
  const blacklistPenaltySol = computeBlacklistPenaltySol(validator)
  const bidTooLowPenaltySol = computeBidTooLowPenaltySol(
    validator,
    dsSamConfig,
    winningTotalPmpe,
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
  const [editBond, setEditBond] = useState(
    (validator.bondBalanceSol ?? 0).toString(),
  )
  // Mirror is load-bearing: handleSimToggle and goToSim set simEnabled
  // locally (the parent only learns about it after the debounced onSimulate
  // fires), so simEnabled can't just be a derived `isSimulated`. The effect
  // resyncs when the parent flips isSimulated (e.g. on clearSimulation).
  const [simEnabled, setSimEnabled] = useState(isSimulated)
  useEffect(() => {
    setSimEnabled(isSimulated)
  }, [isSimulated])

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
      const bondValue = editBond !== '' ? parseFloat(editBond) : null
      onSimulateRef.current(
        !isNaN(inflationValue) ? inflationValue : null,
        mevValue,
        blockValue,
        !isNaN(bidValue) ? bidValue : null,
        bondValue !== null && !isNaN(bondValue) ? bondValue : null,
      )
    }, 400)
    return () => clearTimeout(t)
  }, [simEnabled, editBid, editInflation, editMev, editBlock, editBond])

  const makeSimWheelHandler =
    (value: string, setter: (v: string) => void, step: number) =>
    (e: React.WheelEvent<HTMLInputElement>) => {
      if (document.activeElement !== e.currentTarget) return
      e.preventDefault()
      const current = parseFloat(value) || 0
      const next = e.deltaY < 0 ? current + step : current - step
      setter(String(Math.round(next / step) * step))
    }

  const handleSimToggle = (enabled: boolean) => {
    setSimEnabled(enabled)
    firstRun.current = true
    if (enabled) setTab('overview')
    if (!enabled && onClearSimulation) onClearSimulation()
  }

  const goToSim = () => {
    setSimEnabled(true)
    firstRun.current = true
    setTab('overview')
  }

  // Banner tone follows the bond-health axis when the tip is bond-driven,
  // otherwise tracks the tip's own urgency. Click target reuses the shared
  // TIP_TAB map so banner-nav and tab-dot can't disagree.
  const tipTarget = TIP_TAB[tip.constraint]

  const attention = tabAttention({
    bondHealth,
    bidPenaltySol: bidTooLowPenaltySol,
    notes: notificationSummary?.notifications ?? [],
    tipConstraint: tip.constraint,
  })

  const { penaltyTotal, total: paymentTotal } = computePaymentTotal({
    biddingTotalSol: paymentMetrics.total,
    bidTooLowPenaltySol,
    blacklistPenaltySol,
    bondRiskFeeSol,
    psrEstimates,
  })
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
          isSimulated && 'ring-4 ring-inset ring-status-yellow',
        )}
      >
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 sticky top-0 z-10 gap-2 bg-background">
          <div className="flex flex-col gap-1 min-w-0">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start cursor-pointer"
              onClick={onClose}
            >
              {ICON_CHEVRON_LEFT_SM}
              Back to rankings
            </button>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 flex flex-col leading-tight">
                <span
                  className="text-base font-bold font-mono flex items-center gap-1"
                  style={{ color: tipStyle.color }}
                >
                  <span className="text-sm leading-none">
                    {TIP_ICONS[getTipIcon(tip)]}
                  </span>
                  {`#${rank}`}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {posVsWinning === 0
                    ? 'at winning edge'
                    : posVsWinning > 0
                      ? `${posVsWinning} ${posVsWinning === 1 ? 'place' : 'places'} above winning`
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
          </div>
        </div>

        <StatusBanner
          className="mx-4 sm:mx-6 my-3"
          status={{
            label: tip.text,
            tone: tipBannerTone(tip, bondHealth),
            action:
              tipTarget && tipTarget !== tab
                ? {
                    label:
                      tip.constraint === 'bond' ? 'Bond tab →' : 'Simulate →',
                    onClick: () => setTab(tipTarget),
                  }
                : undefined,
          }}
        />

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
                marinadeActivatedStakeSol={validator.marinadeActivatedStakeSol}
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
                            <div className="text-2xs text-muted-foreground italic mt-1.5">
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
                  label="Activated Marinade stake"
                  value={stake(validator.marinadeActivatedStakeSol)}
                />
                <MetricRow
                  label="Target Marinade stake"
                  help="How much stake the auction decided you should have this epoch, based on your bid and how you scored."
                  value={stake(validator.auctionStake.marinadeSamTargetSol)}
                />
                {validator.maxStakeWanted != null &&
                  validator.maxStakeWanted > 0 && (
                    <MetricRow
                      label="Max stake wanted"
                      help="The self-imposed stake cap you set. The auction will not assign you more than this amount."
                      value={stake(validator.maxStakeWanted)}
                    />
                  )}
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
                  value={bondCoverageLabel(
                    bondHealth,
                    bondCoverage,
                    expectedStakeDelta,
                  )}
                  valueStyle={{ color: bondCoverageColor(bondHealth) }}
                />
                <MetricRow
                  label="Bond runway"
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
                  label="Activated stake cost"
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
                    value={pay(penaltyTotal, 3)}
                    valueStyle={{ color: CSS_DESTRUCTIVE }}
                    onSeeBreakdown={() =>
                      setTab(bidTooLowPenaltySol > 0 ? 'penalty' : 'payments')
                    }
                  />
                )}
                {bidTooLowPenaltySol > 0 && (
                  <PenaltyRow
                    label="↳ bid-too-low penalty"
                    value={pay(bidTooLowPenaltySol, 3)}
                    onSeeBreakdown={() => setTab('penalty')}
                    sub
                  />
                )}
                {blacklistPenaltySol > 0 && (
                  <PenaltyRow
                    label="↳ blacklist penalty"
                    value={pay(blacklistPenaltySol, 3)}
                    onSeeBreakdown={() => setTab('payments')}
                    sub
                  />
                )}
                {bondRiskFeeSol > 0 && (
                  <PenaltyRow
                    label="↳ bond risk fee"
                    value={pay(bondRiskFeeSol, 3)}
                    onSeeBreakdown={() => setTab('bond')}
                    sub
                  />
                )}
                <MetricRow
                  label="Expected payment this epoch"
                  value={pay(paymentTotal, 3)}
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
                      Static bid (PMPE)
                    </label>
                    <Input
                      type="number"
                      value={editBid}
                      onChange={e => setEditBid(e.target.value)}
                      onWheel={makeSimWheelHandler(editBid, setEditBid, 0.001)}
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
                      onWheel={makeSimWheelHandler(
                        editInflation,
                        setEditInflation,
                        0.1,
                      )}
                      step="0.1"
                      min="0"
                      max="100"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                      MEV Commission %
                      <HelpTip
                        text="MEV (Maximal Extractable Value) — extra tips earned from transaction ordering. Your commission here is the share you keep before passing the rest to stakers."
                        guideTo={`${docsPath(level)}#bidding`}
                      />
                    </label>
                    <Input
                      type="number"
                      value={editMev}
                      onChange={e => setEditMev(e.target.value)}
                      onWheel={makeSimWheelHandler(editMev, setEditMev, 0.1)}
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
                      onWheel={makeSimWheelHandler(
                        editBlock,
                        setEditBlock,
                        0.1,
                      )}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="N/A"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Bond (SOL)
                    </label>
                    <Input
                      type="number"
                      value={editBond}
                      onChange={e => setEditBond(e.target.value)}
                      onWheel={makeSimWheelHandler(editBond, setEditBond, 1)}
                      step="1"
                      min="0"
                      placeholder="—"
                      className="font-mono"
                    />
                  </div>
                </fieldset>
                {originalAuctionResult && isSimulated && (
                  <SimDeltas
                    voteAccount={voteAccount}
                    current={validator}
                    originalAuctionResult={originalAuctionResult}
                    dsSamConfig={dsSamConfig}
                    winningTotalPmpe={winningTotalPmpe}
                  />
                )}
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

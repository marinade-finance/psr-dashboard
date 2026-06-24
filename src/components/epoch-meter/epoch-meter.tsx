import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useRef, useState } from 'react'

import { cn } from 'src/class_utils'
import { Gauge } from 'src/components/gauge/gauge'
import { usePinnedTooltip } from 'src/components/help-tip/help-tip'
import { Tooltip } from 'src/components/ui/tooltip'
import {
  epochInfoProgress,
  epochMeterModel,
  epochProgressFromStart,
  fetchAuctionEpoch,
  fetchEpochInfo,
  fetchEpochMeterData,
  type EpochMeterModel,
  type EpochProgress,
  type TimelineStage,
} from 'src/services/epoch'

// Nav chip: epoch number with a leading progress ring. Hover shows a
// timeline of pipeline stages (payments-settled / auction-settled / live /
// next-auction), each anchored to its concrete epoch.
export const EpochMeter: React.FC = () => {
  const queryClient = useQueryClient()
  // Lean nav queries: the chip needs only scalars (the auction epoch int and a
  // few epoch numbers), so the always-mounted nav never retains the full
  // ['sam'] AuctionResult or the multi-MB ['protected-events'] payload. Both
  // reuse the shared caches via ensureQueryData. staleTime === refetchInterval
  // so navigation never refetches — load at most once per epoch-scale timeout,
  // keep cached, no reload churn.
  const { data: auctionEpoch } = useQuery({
    queryKey: ['auction-epoch'],
    queryFn: () => fetchAuctionEpoch(queryClient),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  })
  const { data: meter } = useQuery({
    queryKey: ['epoch-meter'],
    queryFn: () => fetchEpochMeterData(queryClient),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  })
  // Best-effort slot-accurate progress; falls back to the API timestamp path
  // when the RPC is blocked. retry:false keeps a blocked endpoint quiet.
  const { data: epochInfo } = useQuery({
    queryKey: ['epoch-info'],
    queryFn: ({ signal }) => fetchEpochInfo(signal),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: false,
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Click pins the timeline tooltip open (sticky), same singleton as HelpTip.
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [hovered, setHovered] = useState(false)
  const { pinned, toggle } = usePinnedTooltip(triggerRef)

  if (auctionEpoch === undefined) return null

  const networkEpoch = meter?.networkEpoch ?? null
  const paymentSettled = meter?.paymentSettled ?? null
  const auctionSettled = meter?.auctionSettled ?? null
  const progress =
    epochInfo && epochInfo.epoch === networkEpoch
      ? epochInfoProgress(epochInfo)
      : epochProgressFromStart(meter?.liveEpoch ?? null, now)

  const model = epochMeterModel({
    auctionEpoch,
    networkEpoch,
    paymentSettled,
    auctionSettled,
  })
  const ringPercent =
    progress && progress.epoch === networkEpoch ? progress.percent : 0

  return (
    <Tooltip
      content={<TimelineCard model={model} progress={progress} />}
      open={pinned || hovered}
      onOpenChange={o => {
        if (!pinned) setHovered(o)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          model.critical
            ? `${model.label} (data stale by more than one epoch)`
            : model.stale
              ? `${model.label} (stale)`
              : model.label
        }
        aria-pressed={pinned}
        onPointerDown={e => e.preventDefault()}
        onClick={toggle}
        className={cn(
          'text-xs font-mono px-2 py-1 rounded-md whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
          model.critical
            ? 'bg-destructive-light text-destructive border-destructive/25'
            : model.stale
              ? 'bg-warning-light text-warning border-warning/25'
              : 'bg-muted text-muted-foreground border-border/50',
        )}
      >
        <ProgressRing percent={ringPercent} size={12} />
        {model.label}
      </button>
    </Tooltip>
  )
}

type RingProps = { percent: number; size: number }

function ProgressRing({ percent, size }: RingProps) {
  let pct = Math.max(0, Math.min(100, percent))
  if (pct < 4) pct = 0
  if (pct > 96) pct = 100
  const r = size / 2 - 1
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {pct > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap={size > 12 ? 'round' : 'butt'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  )
}

const STAGE_LABEL: Record<TimelineStage, string> = {
  ['payment']: 'payments settled',
  ['auction']: 'auction settled',
  ['live']: 'live',
  ['next']: 'next auction',
}

function nodeLabel(stages: TimelineStage[]): string {
  return stages.map(s => STAGE_LABEL[s]).join(' · ')
}

function TimelineCard({
  model,
  progress,
}: {
  model: EpochMeterModel
  progress: EpochProgress | null
}) {
  const { timeline } = model
  if (timeline.length === 0) return null
  const percent = progress?.percent ?? 0
  const hours = progress?.hoursRemaining ?? null
  return (
    <div className="flex flex-col items-center gap-2 py-1 px-1">
      <div className="flex items-stretch">
        {timeline.map((n, i) => {
          const isLive = n.stages.includes('live')
          return (
            <React.Fragment key={n.epoch}>
              {i > 0 && (
                <span className="self-center w-5 h-px bg-border -mx-0.5" />
              )}
              <div
                className={cn(
                  'flex flex-col items-center px-1',
                  isLive ? 'gap-1.5 min-w-[80px]' : 'gap-1 min-w-[60px]',
                )}
              >
                <TimelineDot stages={n.stages} percent={percent} />
                <span
                  className={cn(
                    'font-mono leading-none',
                    isLive
                      ? 'text-sm font-semibold text-foreground'
                      : 'text-3xs text-muted-foreground',
                  )}
                >
                  {n.epoch}
                </span>
                <span
                  className={cn(
                    'leading-tight text-center',
                    isLive
                      ? 'text-3xs font-medium text-foreground'
                      : 'text-2xs text-muted-foreground',
                  )}
                >
                  {nodeLabel(n.stages)}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
      {progress !== null ? (
        <div className="w-full flex flex-col items-stretch gap-1 mt-1 px-1">
          <Gauge value={percent} scaleMax={100} tone="bg-primary" size="lg" />
          <span className="text-2xs text-muted-foreground text-center">
            {hours !== null
              ? `~${Math.round(hours)}h remaining`
              : 'Time remaining unknown'}
          </span>
        </div>
      ) : (
        <span className="text-2xs text-muted-foreground text-center mt-1">
          Time remaining unknown
        </span>
      )}
    </div>
  )
}

function TimelineDot({
  stages,
  percent,
}: {
  stages: TimelineStage[]
  percent: number
}) {
  if (stages.includes('live')) {
    return <ProgressRing percent={percent} size={22} />
  }
  if (stages.includes('payment')) {
    return <span className="w-3 h-3 rounded-full bg-foreground inline-block" />
  }
  if (stages.includes('auction')) {
    return (
      <span className="w-3 h-3 rounded-full bg-muted-foreground inline-block" />
    )
  }
  return (
    <span className="w-3 h-3 rounded-full border-[1.5px] border-muted-foreground inline-block" />
  )
}

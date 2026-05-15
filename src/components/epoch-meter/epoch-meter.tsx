import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'

import { cn } from 'src/class_utils'
import { Tooltip } from 'src/components/ui/tooltip'
import {
  epochMeterModel,
  selectCurrentEpochProgress,
  selectLatestSettlement,
  selectNetworkEpoch,
  type EpochMeterModel,
  type EpochProgress,
} from 'src/services/epoch'
import { loadSam } from 'src/services/sam'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

// Nav chip: epoch number with a leading progress ring. Hover shows a
// 3-dot timeline (settled → live → auction target) + hours remaining.
export const EpochMeter: React.FC = () => {
  const { data: sam } = useQuery({
    queryKey: ['sam', 0],
    queryFn: () => loadSam(null),
  })
  const { data: protectedEvents } = useQuery({
    queryKey: ['protected-events'],
    queryFn: fetchProtectedEventsWithValidator,
    staleTime: 5 * 60 * 1000,
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const auctionEpoch = sam?.auctionResult.auctionData.epoch
  if (auctionEpoch === undefined) return null

  const validators = protectedEvents
    ? protectedEvents.flatMap(e => (e.validator ? [e.validator] : []))
    : []
  const networkEpoch = validators.length ? selectNetworkEpoch(validators) : null
  const settlement = protectedEvents
    ? selectLatestSettlement(protectedEvents)
    : null
  const progress = validators.length
    ? selectCurrentEpochProgress(validators, now)
    : null

  const model = epochMeterModel({ auctionEpoch, networkEpoch, settlement })
  const ringPercent =
    progress && progress.epoch === model.timeline.live ? progress.percent : 0

  return (
    <Tooltip content={<TimelineCard model={model} progress={progress} />}>
      <span
        className={cn(
          'text-xs font-mono px-2 py-1 rounded-md bg-muted whitespace-nowrap inline-flex items-center gap-1.5 cursor-default',
          model.stale ? 'text-warning' : 'text-muted-foreground',
        )}
      >
        <ProgressRing percent={ringPercent} size={12} />
        {model.label}
      </span>
    </Tooltip>
  )
}

type RingProps = { percent: number; size: number }

function ProgressRing({ percent, size }: RingProps) {
  const r = size / 2 - 1
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, percent)) / 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

type NodeState = 'done' | 'live' | 'future'
type Node = { epoch: number; state: NodeState; label: string }

function buildNodes(model: EpochMeterModel): Node[] {
  const { settled, live, target } = model.timeline
  const out: Node[] = []
  if (settled !== null) {
    out.push({ epoch: settled, state: 'done', label: 'settled' })
  }
  if (live !== null && live !== settled) {
    const label = live === target ? 'live · auction' : 'live'
    out.push({ epoch: live, state: 'live', label })
  }
  if (target !== live) {
    const state: NodeState = live === null || target > live ? 'future' : 'done'
    out.push({ epoch: target, state, label: 'auction' })
  }
  return out
}

function TimelineCard({
  model,
  progress,
}: {
  model: EpochMeterModel
  progress: EpochProgress | null
}) {
  const nodes = buildNodes(model)
  const percent = progress?.percent ?? 0
  const hours = progress?.hoursRemaining ?? null
  return (
    <div className="flex flex-col items-center gap-2 py-1 px-1">
      <div className="flex items-center">
        {nodes.map((n, i) => (
          <React.Fragment key={`${n.epoch}-${i}`}>
            {i > 0 && <span className="w-6 h-px bg-border mx-1" />}
            <div className="flex flex-col items-center gap-0.5">
              <TimelineDot state={n.state} percent={percent} />
              <span className="text-[10px] font-mono leading-none mt-1">
                {n.epoch}
              </span>
              <span className="text-[9px] text-muted-foreground leading-none">
                {n.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
      {hours !== null && (
        <span className="text-[10px] text-muted-foreground">
          ~{Math.round(hours)}h remaining
        </span>
      )}
    </div>
  )
}

function TimelineDot({
  state,
  percent,
}: {
  state: NodeState
  percent: number
}) {
  if (state === 'done') {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-foreground inline-block" />
    )
  }
  if (state === 'future') {
    return (
      <span className="w-2.5 h-2.5 rounded-full border border-muted-foreground inline-block" />
    )
  }
  return <ProgressRing percent={percent} size={14} />
}

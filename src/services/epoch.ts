import { RPC_URL } from './apiUrls'
import { EPOCH_DURATION_MS } from './constants'
import { loadSam } from './sam'
import { fetchProtectedEventsWithValidators } from './validator-with-protected_event'

import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

import type { Validator } from 'src/services/validators'
import type { QueryClient } from '@tanstack/react-query'

export { EPOCH_DURATION_MS }

const SLOT_DURATION_S = 0.4

export type EpochProgress = {
  epoch: number
  percent: number
  hoursRemaining: number
}

export type EpochInfo = {
  epoch: number
  slotIndex: number
  slotsInEpoch: number
}

// Best-effort slot-accurate epoch progress straight from the cluster.
// getEpochInfo gives slotIndex / slotsInEpoch with no timestamp lag — the
// validators API only stamps epoch_start_at once it processes new-epoch
// stats, which can trail the actual flip by hours. Returns null on any
// failure (CORS, rate-limit, offline) so the caller falls back silently.
export async function fetchEpochInfo(
  signal?: AbortSignal,
): Promise<EpochInfo | null> {
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo' }),
      signal,
    })
    if (!res.ok) return null
    const json: unknown = await res.json()
    const r = (json as { result?: Partial<EpochInfo> } | null)?.result
    if (
      !r ||
      typeof r.epoch !== 'number' ||
      typeof r.slotIndex !== 'number' ||
      typeof r.slotsInEpoch !== 'number' ||
      r.slotsInEpoch <= 0
    ) {
      return null
    }
    return {
      epoch: r.epoch,
      slotIndex: r.slotIndex,
      slotsInEpoch: r.slotsInEpoch,
    }
  } catch {
    return null
  }
}

// Slot-based progress from getEpochInfo — exact, no timestamp arithmetic.
export const epochInfoProgress = (info: EpochInfo): EpochProgress => ({
  epoch: info.epoch,
  percent: Math.min(100, (info.slotIndex / info.slotsInEpoch) * 100),
  hoursRemaining: Math.max(
    0,
    ((info.slotsInEpoch - info.slotIndex) * SLOT_DURATION_S) / 3600,
  ),
})

export type TimelineStage = 'payment' | 'auction' | 'live' | 'next'

export type TimelineNode = {
  epoch: number
  stages: TimelineStage[]
}

export type EpochMeterModel = {
  label: string
  stale: boolean
  critical: boolean
  timeline: TimelineNode[]
}

// Network epoch = newest epoch any validator has stats for. The in-progress
// epoch has `epoch_end_at === null`, but max() over all stats is enough.
export const selectNetworkEpoch = (validators: Validator[]): number | null => {
  let max = -Infinity
  for (const v of validators) {
    for (const stat of v.epoch_stats) {
      if (stat.epoch > max) max = stat.epoch
    }
  }
  return max === -Infinity ? null : max
}

export type LiveEpochStart = { epoch: number; startMs: number }

// The in-progress epoch's start. The live epoch's own `epoch_start_at` is
// stamped late by the API (≈ when its first stat row is created, often hours
// after the boundary), so using it makes the meter read ~0% / ~48h all epoch.
// The reliable boundary is the *previous* epoch's `epoch_end_at` — the latest
// non-null end across settled epochs is exactly when the live epoch began.
// A tiny scalar — safe to retain in the nav.
export const selectLiveEpochStart = (
  validators: Validator[],
): LiveEpochStart | null => {
  let liveEpoch = -Infinity
  let liveOwnStartMs: number | null = null // best-effort fallback only
  let lastSettledEndMs = -Infinity
  for (const v of validators) {
    for (const stat of v.epoch_stats) {
      // epoch_end_at is optional in the API schema — null/undefined = still open.
      if (stat.epoch_end_at == null) {
        if (stat.epoch > liveEpoch) {
          liveEpoch = stat.epoch
          const s =
            stat.epoch_start_at == null ? NaN : Date.parse(stat.epoch_start_at)
          liveOwnStartMs = Number.isFinite(s) ? s : null
        }
        continue
      }
      const endMs = Date.parse(stat.epoch_end_at)
      if (Number.isFinite(endMs) && endMs > lastSettledEndMs) {
        lastSettledEndMs = endMs
      }
    }
  }
  if (liveEpoch === -Infinity) return null
  // Prefer the previous epoch's end (reliable boundary). Fall back to the live
  // epoch's own (late-stamped) start only when no settled epoch is present —
  // a degenerate case that does not occur with the API's 3-epoch window.
  const startMs =
    lastSettledEndMs !== -Infinity ? lastSettledEndMs : liveOwnStartMs
  if (startMs === null) return null
  return { epoch: liveEpoch, startMs }
}

// Map elapsed time since the epoch start onto a 48h epoch and clamp.
export const epochProgressFromStart = (
  start: LiveEpochStart | null,
  nowMs: number,
): EpochProgress | null => {
  if (start === null) return null
  const elapsed = Math.max(0, nowMs - start.startMs)
  const percent = Math.min(100, (elapsed / EPOCH_DURATION_MS) * 100)
  const hoursRemaining = Math.max(0, (EPOCH_DURATION_MS - elapsed) / 3_600_000)
  return { epoch: start.epoch, percent, hoursRemaining }
}

// Progress through the in-progress epoch, derived from validator stats.
export const selectCurrentEpochProgress = (
  validators: Validator[],
  nowMs: number,
): EpochProgress | null => {
  const start = selectLiveEpochStart(validators)
  if (start === null) return null
  const elapsed = Math.max(0, nowMs - start.startMs)
  const percent = Math.min(100, (elapsed / EPOCH_DURATION_MS) * 100)
  const hoursRemaining = Math.max(0, (EPOCH_DURATION_MS - elapsed) / 3_600_000)
  return { epoch: start.epoch, percent, hoursRemaining }
}

// Latest past FACT (on-chain) PE epoch — the payments-settled checkpoint.
// Filters out anything on/after the live epoch: an epoch only counts as
// "payments settled" once it has ended.
export const selectLatestPaymentSettled = (
  protectedEvents: ProtectedEventWithValidator[],
  networkEpoch: number | null,
): number | null => {
  let max = -Infinity
  for (const e of protectedEvents) {
    if (networkEpoch !== null && e.protectedEvent.epoch >= networkEpoch)
      continue
    if (e.status === 'fact' && e.protectedEvent.epoch > max) {
      max = e.protectedEvent.epoch
    }
  }
  return max === -Infinity ? null : max
}

// Latest past PE epoch of any status (FACT/ESTIMATE/DRYRUN) — the auction
// has been decided for this epoch even if payments aren't on-chain yet.
// Live epoch is excluded: the auction-of-the-live-epoch is shown by the
// 'live' node, not double-counted as "auction settled".
export const selectLatestAuctionSettled = (
  protectedEvents: ProtectedEventWithValidator[],
  networkEpoch: number | null,
): number | null => {
  let max = -Infinity
  for (const e of protectedEvents) {
    if (networkEpoch !== null && e.protectedEvent.epoch >= networkEpoch)
      continue
    if (e.protectedEvent.epoch > max) max = e.protectedEvent.epoch
  }
  return max === -Infinity ? null : max
}

// Lean nav model for the EpochMeter: only the scalars the chip/tooltip render.
// The meter lives in the always-mounted nav; observing the full
// ['protected-events'] payload there pins its multi-MB 3-epoch validator
// cross-references for the whole session. This derives the scalars and keeps
// only those (plus the tiny live-epoch start), so the nav never retains the
// heavy payload. The heavy result is reused from the shared
// ['protected-events'] cache via ensureQueryData (no double fetch on the
// Events page), but with no persistent observer here it becomes GC-eligible
// once the Events page unmounts.
export type EpochMeterData = {
  networkEpoch: number | null
  paymentSettled: number | null
  auctionSettled: number | null
  liveEpoch: LiveEpochStart | null
}

// The nav chip needs only the auction epoch (an int), but the full
// AuctionResult is large. Reuse the shared ['sam'] cache via ensureQueryData
// and retain only the number here, so the nav never holds the AuctionResult —
// it stays observed only by SamPage and is GC-eligible once that unmounts.
export async function fetchAuctionEpoch(qc: QueryClient): Promise<number> {
  const sam = await qc.ensureQueryData({
    queryKey: ['sam'],
    queryFn: () => loadSam(),
  })
  return sam.auctionResult.auctionData.epoch
}

export async function fetchEpochMeterData(
  qc: QueryClient,
): Promise<EpochMeterData> {
  // Reuse / populate the shared ['protected-events'] cache; its own observers
  // (the Events page) drive abort, and ensureQueryData adds none here.
  const events = await qc.ensureQueryData({
    queryKey: ['protected-events'],
    queryFn: ({ signal }) => fetchProtectedEventsWithValidators(qc, signal),
  })
  const validators = events.flatMap(e => (e.validator ? [e.validator] : []))
  const networkEpoch = validators.length ? selectNetworkEpoch(validators) : null
  return {
    networkEpoch,
    paymentSettled: selectLatestPaymentSettled(events, networkEpoch),
    auctionSettled: selectLatestAuctionSettled(events, networkEpoch),
    liveEpoch: selectLiveEpochStart(validators),
  }
}

export const epochMeterModel = ({
  auctionEpoch,
  networkEpoch,
  paymentSettled,
  auctionSettled,
}: {
  auctionEpoch: number
  networkEpoch: number | null
  paymentSettled: number | null
  auctionSettled: number | null
}): EpochMeterModel => {
  const differ = networkEpoch !== null && networkEpoch !== auctionEpoch
  const stale = networkEpoch !== null && auctionEpoch < networkEpoch
  const critical = networkEpoch !== null && networkEpoch - auctionEpoch > 1
  const label = differ
    ? `${networkEpoch} → ${auctionEpoch}`
    : `Epoch ${auctionEpoch}`

  const map = new Map<number, TimelineStage[]>()
  const add = (epoch: number | null, stage: TimelineStage) => {
    if (epoch === null) return
    const arr = map.get(epoch) ?? []
    arr.push(stage)
    map.set(epoch, arr)
  }
  add(paymentSettled, 'payment')
  if (auctionSettled !== paymentSettled) add(auctionSettled, 'auction')
  add(networkEpoch ?? auctionEpoch, 'live')
  if (networkEpoch !== null && auctionEpoch > networkEpoch)
    add(auctionEpoch, 'next')

  const timeline: TimelineNode[] = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([epoch, stages]) => ({ epoch, stages }))

  return { label, stale, critical, timeline }
}

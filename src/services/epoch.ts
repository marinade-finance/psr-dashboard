import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

import type { Validator } from 'src/services/validators'

export const EPOCH_DURATION_MS = 48 * 60 * 60 * 1000

export type EpochProgress = {
  epoch: number
  percent: number
  hoursRemaining: number
}

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

// Progress through the in-progress epoch. The in-progress stat has
// epoch_end_at === null and a start time; we map elapsed time onto a 48h
// epoch and clamp.
export const selectCurrentEpochProgress = (
  validators: Validator[],
  nowMs: number,
): EpochProgress | null => {
  let best: { epoch: number; startMs: number } | null = null
  for (const v of validators) {
    for (const stat of v.epoch_stats) {
      if (stat.epoch_end_at !== null || stat.epoch_start_at === null) continue
      const startMs = Date.parse(stat.epoch_start_at)
      if (!Number.isFinite(startMs)) continue
      if (best === null || stat.epoch > best.epoch) {
        best = { epoch: stat.epoch, startMs }
      }
    }
  }
  if (best === null) return null
  const elapsed = Math.max(0, nowMs - best.startMs)
  const percent = Math.min(100, (elapsed / EPOCH_DURATION_MS) * 100)
  const hoursRemaining = Math.max(0, (EPOCH_DURATION_MS - elapsed) / 3_600_000)
  return { epoch: best.epoch, percent, hoursRemaining }
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
    if (
      e.status === 'fact' &&
      e.protectedEvent.epoch > max
    ) {
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
  if (auctionSettled !== paymentSettled)
    add(auctionSettled, 'auction')
  add(networkEpoch, 'live')
  if (auctionEpoch > (networkEpoch ?? -Infinity))
    add(auctionEpoch, 'next')

  const timeline: TimelineNode[] = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([epoch, stages]) => ({ epoch, stages }))

  return { label, stale, critical, timeline }
}

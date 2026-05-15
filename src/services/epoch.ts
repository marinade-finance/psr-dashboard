import {
  ProtectedEventStatus,
  type ProtectedEventWithValidator,
} from 'src/services/validator-with-protected_event'

import type { Validator } from 'src/services/validators'

// Pure epoch-meter logic. No React, no fetching — fully unit-testable.

export const EPOCH_DURATION_MS = 48 * 60 * 60 * 1000

export type Settlement = { epoch: number; onChain: boolean }

export type EpochProgress = {
  epoch: number
  percent: number
  hoursRemaining: number
}

export type EpochMeterModel = {
  label: string
  arrow: boolean
  stale: boolean
  timeline: {
    settled: number | null
    live: number | null
    target: number
  }
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

// Latest protected-events epoch and whether it is on-chain (FACT) vs an
// estimate (ESTIMATE / DRYRUN — not yet settled on-chain).
export const selectLatestSettlement = (
  protectedEvents: ProtectedEventWithValidator[],
): Settlement | null => {
  let latest: ProtectedEventWithValidator | null = null
  for (const e of protectedEvents) {
    if (
      latest === null ||
      e.protectedEvent.epoch > latest.protectedEvent.epoch
    ) {
      latest = e
    }
  }
  if (latest === null) return null
  return {
    epoch: latest.protectedEvent.epoch,
    onChain: latest.status === ProtectedEventStatus.FACT,
  }
}

export const epochMeterModel = ({
  auctionEpoch,
  networkEpoch,
  settlement,
}: {
  auctionEpoch: number
  networkEpoch: number | null
  settlement: Settlement | null
}): EpochMeterModel => {
  const differ = networkEpoch !== null && networkEpoch !== auctionEpoch
  const stale = networkEpoch !== null && auctionEpoch < networkEpoch
  const label = differ
    ? `${networkEpoch} → ${auctionEpoch}`
    : `Epoch ${auctionEpoch}`
  return {
    label,
    arrow: differ,
    stale,
    timeline: {
      settled: settlement?.epoch ?? null,
      live: networkEpoch,
      target: auctionEpoch,
    },
  }
}

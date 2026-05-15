import {
  ProtectedEventStatus,
  type ProtectedEventWithValidator,
} from 'src/services/validator-with-protected_event'

import type { Validator } from 'src/services/validators'

// Pure epoch-meter logic. No React, no fetching — fully unit-testable.
// All branching and user-facing copy lives here; the component is dumb render.

export type Settlement = { epoch: number; onChain: boolean }

export type EpochMeterModel = {
  label: string
  arrow: boolean
  stale: boolean
  lines: string[]
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

  const lines: string[] = [`Auction allocates stake for epoch ${auctionEpoch}.`]

  if (networkEpoch !== null) {
    let tail: string
    if (auctionEpoch === networkEpoch) {
      tail = 'this is the live allocation.'
    } else if (auctionEpoch === networkEpoch + 1) {
      tail = "this is next epoch's allocation."
    } else {
      const behind = networkEpoch - auctionEpoch
      tail = `the view is ${behind} epoch${behind === 1 ? '' : 's'} behind the chain.`
    }
    lines.push(`Solana is in epoch ${networkEpoch} now — ${tail}`)
  }

  if (settlement !== null) {
    lines.push(
      settlement.onChain
        ? `Epoch ${settlement.epoch} settlements: on-chain.`
        : `Epoch ${settlement.epoch} settlements: estimated, not yet on-chain.`,
    )
  }

  return { label, arrow: differ, stale, lines }
}

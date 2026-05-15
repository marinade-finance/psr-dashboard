import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { cn } from 'src/class_utils'
import { HelpTip } from 'src/components/help-tip/help-tip'
import {
  epochMeterModel,
  selectLatestSettlement,
  selectNetworkEpoch,
} from 'src/services/epoch'
import { loadSam } from 'src/services/sam'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

// Auction epoch renders immediately from the already-prefetched ['sam', 0]
// query. The protected-events query is force-populated here (same key +
// queryFn the app registers, 5-min staleTime) so the tooltip's network-epoch
// and settlement lines fill in without the user hovering the Events tab.
// Never blocks the nav: lines 2-3 are simply absent until PE resolves.
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

  const auctionEpoch = sam?.auctionResult.auctionData.epoch
  if (auctionEpoch === undefined) return null

  const networkEpoch = protectedEvents
    ? selectNetworkEpoch(
        protectedEvents.flatMap(e => (e.validator ? [e.validator] : [])),
      )
    : null
  const settlement = protectedEvents
    ? selectLatestSettlement(protectedEvents)
    : null

  const { label, stale, lines } = epochMeterModel({
    auctionEpoch,
    networkEpoch,
    settlement,
  })

  return (
    <span
      className={cn(
        'text-xs font-mono px-2 py-1 rounded-md bg-muted whitespace-nowrap inline-flex items-center gap-1',
        stale ? 'text-warning' : 'text-muted-foreground',
      )}
    >
      {label}
      <HelpTip html={lines.join('<br/>')} />
    </span>
  )
}

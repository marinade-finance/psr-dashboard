import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'
import {
  TEST_BROADCAST_NOTIFICATION,
  TEST_NOTIFICATIONS_MAP,
} from 'src/fixtures/test-notifications'
import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
  TEST_EPOCHS_PER_YEAR,
} from 'src/fixtures/test-validators'
import { ValidatorBondsPage } from 'src/pages/validator-bonds'

import type { UserLevelProps } from 'src/components/navigation/navigation'

const SAM_RESULT = {
  auctionResult: TEST_AUCTION_RESULT,
  epochsPerYear: TEST_EPOCHS_PER_YEAR,
  dcSamConfig: TEST_DS_SAM_CONFIG,
}

export const TestBondsPage: React.FC<UserLevelProps> = ({ level }) => {
  const [queryClient] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          refetchInterval: false,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: false,
        },
      },
    })
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    // EpochMeter (in nav) reads ['sam', 0] and ['protected-events']; nav
    // hover prefetches ['protected-events']. Seed both so nothing leaks.
    queryClient.setQueryData(['sam', 0], SAM_RESULT)
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    queryClient.setQueryData(
      ['notifications-broadcast'],
      TEST_BROADCAST_NOTIFICATION,
    )
    queryClient.setQueryData(
      ['notifications-all', 'sam_auction'],
      TEST_NOTIFICATIONS_MAP,
    )
    return queryClient
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ValidatorBondsPage level={level} />
    </QueryClientProvider>
  )
}

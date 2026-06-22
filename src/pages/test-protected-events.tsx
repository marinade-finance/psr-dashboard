import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'
import { TEST_BROADCAST_NOTIFICATION } from 'src/fixtures/test-notifications'
import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
} from 'src/fixtures/test-validators'
import { ProtectedEventsPage } from 'src/pages/protected-events'
import { EPOCHS_PER_YEAR } from 'src/services/constants'

import type { UserLevelProps } from 'src/components/navigation/navigation'

const SAM_RESULT = {
  auctionResult: TEST_AUCTION_RESULT,
  epochsPerYear: EPOCHS_PER_YEAR,
  dsSamConfig: TEST_DS_SAM_CONFIG,
}

export const TestProtectedEventsPage: React.FC<UserLevelProps> = ({
  level,
}) => {
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
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    // EpochMeter (in nav) reads ['sam']; nav hover prefetches ['bonds'].
    queryClient.setQueryData(['sam'], SAM_RESULT)
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    queryClient.setQueryData(
      ['notifications-broadcast'],
      TEST_BROADCAST_NOTIFICATION,
    )
    return queryClient
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedEventsPage level={level} />
    </QueryClientProvider>
  )
}

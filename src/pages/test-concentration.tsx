import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { TEST_NETWORK_CONCENTRATION } from 'src/fixtures/test-cluster-stats'
import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
} from 'src/fixtures/test-validators'
import { ConcentrationPage } from 'src/pages/concentration'
import { EPOCHS_PER_YEAR } from 'src/services/constants'

import type { UserLevelProps } from 'src/components/navigation/navigation'

const SAM_RESULT = {
  auctionResult: TEST_AUCTION_RESULT,
  epochsPerYear: EPOCHS_PER_YEAR,
  dsSamConfig: TEST_DS_SAM_CONFIG,
}

export const TestConcentrationPage: React.FC<UserLevelProps> = ({ level }) => {
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
    queryClient.setQueryData(['sam'], SAM_RESULT)
    queryClient.setQueryData(['cluster-stats'], TEST_NETWORK_CONCENTRATION)
    // EpochMeter (in nav) reads ['sam'] and ['protected-events']; nav hover
    // prefetches ['protected-events']. Seed it so nothing leaks to the network.
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    return queryClient
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ConcentrationPage level={level} />
    </QueryClientProvider>
  )
}

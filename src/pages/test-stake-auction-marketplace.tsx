import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'

import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'
import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
  TEST_EPOCHS_PER_YEAR,
  TEST_VALIDATOR_NAMES,
} from 'src/fixtures/test-validators'
import { SamPage } from 'src/pages/stake-auction-marketplace'

import type { UserLevelProps } from 'src/components/navigation/navigation'
import type { SamDataSources } from 'src/pages/stake-auction-marketplace'

const SAM_RESULT = {
  auctionResult: TEST_AUCTION_RESULT,
  epochsPerYear: TEST_EPOCHS_PER_YEAR,
  dcSamConfig: TEST_DS_SAM_CONFIG,
}

export const TestSamPage: React.FC<UserLevelProps> = ({ level }) => {
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
    // EpochMeter inside the navigation reads ['sam', 0] and
    // ['protected-events']; nav hover prefetches ['bonds']. Seed all three
    // so the test page never reaches upstream APIs.
    queryClient.setQueryData(['sam', 0], SAM_RESULT)
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    queryClient.setQueryData(['validator-names'], TEST_VALIDATOR_NAMES)
    queryClient.setQueryData(['notifications-broadcast'], null)
    queryClient.setQueryData(['notifications-all', 'sam_auction'], {})
    // psrEstimates fires per-validator when the Payments tab opens. Seed an
    // empty array for every fixture vote account; the tab still renders.
    for (const voteAccount of TEST_VALIDATOR_NAMES.keys()) {
      queryClient.setQueryData(['psrEstimates', voteAccount], [])
    }
    return queryClient
  })
  const dataSources = useMemo<SamDataSources>(
    () => ({
      loadAuction: () => Promise.resolve(SAM_RESULT),
      loadValidatorNames: () => Promise.resolve(TEST_VALIDATOR_NAMES),
    }),
    [],
  )
  return (
    <QueryClientProvider client={queryClient}>
      <SamPage level={level} dataSources={dataSources} />
    </QueryClientProvider>
  )
}

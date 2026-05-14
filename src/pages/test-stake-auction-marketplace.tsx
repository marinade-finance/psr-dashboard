import React, { useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

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
    // Suppress notification fetchers; the page checks falsy.
    queryClient.setQueryDefaults('notifications-broadcast', { enabled: false })
    queryClient.setQueryData('notifications-broadcast', null)
    queryClient.setQueryDefaults(['notifications-all'], { enabled: false })
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

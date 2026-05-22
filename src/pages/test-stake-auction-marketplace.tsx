import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'

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
  TEST_VALIDATOR_NAMES,
} from 'src/fixtures/test-validators'
import { SamPage } from 'src/pages/stake-auction-marketplace'
import { runSdkRerun } from 'src/services/sdk-rerun'

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
    // SamPage subscribes to the canonical ['sam'] queryKey; the bonds and
    // protected-events service functions read from the same key via
    // queryClient.ensureQueryData (see the library-native-refactor branch).
    // EpochMeter shares the same cache entry. Seed every active consumer so
    // the test page never reaches upstream APIs.
    queryClient.setQueryData(['sam'], SAM_RESULT)
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    queryClient.setQueryData(['validator-names'], TEST_VALIDATOR_NAMES)
    queryClient.setQueryData(
      ['notifications-broadcast'],
      TEST_BROADCAST_NOTIFICATION,
    )
    queryClient.setQueryData(
      ['notifications-all', 'sam_auction'],
      TEST_NOTIFICATIONS_MAP,
    )
    // The Payments tab in validator-detail now uses a single shared query
    // `['psr-estimates-all']` (was per-validator). Seed an empty array; the
    // tab still renders the empty state without firing a fetch.
    queryClient.setQueryData(['psr-estimates-all'], [])
    return queryClient
  })
  const dataSources = useMemo<SamDataSources>(
    () => ({
      loadAuction: overrides => {
        // Skip the SDK rerun when no overrides are active. Fixtures pre-bake
        // `bondGoodForNEpochs`, `marinadeSamTargetSol`, etc. to specific demo
        // values; `Auction.evaluate()` overwrites them with SDK-derived ones
        // — and on synthetic data (intentionally tiny bonds for critical
        // states) the recomputed runway comes out negative for ~all rows,
        // tripping `passesTableFilter`'s runway check and hiding the table.
        // Only rerun the SDK when the user actually simulated something.
        const hasOverrides =
          overrides != null &&
          (overrides.source.inflationCommissionsDec.size > 0 ||
            overrides.source.mevCommissionsDec.size > 0 ||
            overrides.source.blockRewardsCommissionsDec.size > 0 ||
            overrides.source.cpmpesDec.size > 0 ||
            overrides.bondBalanceSol.size > 0)
        const auctionResult = hasOverrides
          ? runSdkRerun(
              TEST_AUCTION_RESULT.auctionData,
              TEST_DS_SAM_CONFIG,
              overrides,
            )
          : TEST_AUCTION_RESULT
        return Promise.resolve({ ...SAM_RESULT, auctionResult })
      },
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

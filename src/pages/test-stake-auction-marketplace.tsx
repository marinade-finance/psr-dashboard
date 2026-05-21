import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { loadLiveSnapshot } from 'src/fixtures/snapshot-loader'
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
  TEST_VALIDATORS,
} from 'src/fixtures/test-validators'
import { SamPage } from 'src/pages/stake-auction-marketplace'
import { runSdkRerun } from 'src/services/sdk-rerun'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { UserLevelProps } from 'src/components/navigation/navigation'
import type { SamDataSources } from 'src/pages/stake-auction-marketplace'

const SYNTHETIC_SAM_RESULT = {
  auctionResult: TEST_AUCTION_RESULT,
  epochsPerYear: TEST_EPOCHS_PER_YEAR,
  dcSamConfig: TEST_DS_SAM_CONFIG,
}

function mergeWithSynthetic(snapshotResult: AuctionResult): AuctionResult {
  // Prepend real validators; append synthetic edge-case validators so they
  // always appear and existing tests can still find them.
  return {
    ...snapshotResult,
    auctionData: {
      ...snapshotResult.auctionData,
      validators: [
        ...snapshotResult.auctionData.validators,
        ...TEST_VALIDATORS,
      ],
    },
  }
}

export const TestSamPage: React.FC<UserLevelProps> = ({ level }) => {
  // samResultRef holds the current auction result for dataSources.loadAuction.
  // Using a ref avoids stale-closure issues without redeclaring dataSources.
  const samResultRef = useRef(SYNTHETIC_SAM_RESULT)

  const [state, setState] = useState<{
    ready: boolean
    validatorNames: Map<string, string>
  }>({ ready: false, validatorNames: TEST_VALIDATOR_NAMES })

  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      }),
  )

  useEffect(() => {
    // Try to augment with live snapshot — if absent (CI / fresh checkout)
    // fall back to synthetic-only. A 404 rejects fetchJson quickly.
    const scale =
      typeof window !== 'undefined'
        ? parseInt(
            new URLSearchParams(window.location.search).get('scale') ?? '1',
            10,
          ) || 1
        : 1

    loadLiveSnapshot(scale)
      .then(snapshot => {
        const merged = mergeWithSynthetic(snapshot.auctionResult)
        samResultRef.current = {
          auctionResult: merged,
          epochsPerYear: TEST_EPOCHS_PER_YEAR,
          dcSamConfig: TEST_DS_SAM_CONFIG,
        }
        // Merge: real names first, synthetic edge-case names appended so
        // tests that search "Test" / "Watch Bond" still find their targets.
        setState({
          ready: true,
          validatorNames: new Map([
            ...snapshot.validatorNames,
            ...TEST_VALIDATOR_NAMES,
          ]),
        })
      })
      .catch(() => {
        // No snapshot — synthetic only
        setState({ ready: true, validatorNames: TEST_VALIDATOR_NAMES })
      })
  }, [])

  // Seed all query keys after data is resolved
  useEffect(() => {
    if (!state.ready) return
    const samResult = samResultRef.current
    queryClient.setQueryData(['sam', 0], samResult)
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    queryClient.setQueryData(['validator-names'], state.validatorNames)
    queryClient.setQueryData(
      ['notifications-broadcast'],
      TEST_BROADCAST_NOTIFICATION,
    )
    queryClient.setQueryData(
      ['notifications-all', 'sam_auction'],
      TEST_NOTIFICATIONS_MAP,
    )
    // psrEstimates fires per-validator when the Payments tab opens.
    for (const voteAccount of state.validatorNames.keys()) {
      queryClient.setQueryData(['psrEstimates', voteAccount], [])
    }
    for (const voteAccount of TEST_VALIDATOR_NAMES.keys()) {
      queryClient.setQueryData(['psrEstimates', voteAccount], [])
    }
    // Expose for Playwright assertions
    ;(window as typeof window & { snapshotMeta: unknown }).snapshotMeta = {
      validatorCount: samResult.auctionResult.auctionData.validators.length,
    }
  }, [state, queryClient])

  const dataSources = useMemo<SamDataSources>(
    () => ({
      loadAuction: overrides => {
        // Simulation reruns always use synthetic data only — the SDK rerun
        // on 700+ real validators would be too slow in-browser. The real
        // validators are already in the queryClient cache and will be restored
        // when overrides are cleared.
        const hasOverrides =
          overrides != null &&
          (overrides.source.inflationCommissionsDec.size > 0 ||
            overrides.source.mevCommissionsDec.size > 0 ||
            overrides.source.blockRewardsCommissionsDec.size > 0 ||
            overrides.source.cpmpesDec.size > 0 ||
            overrides.bondBalanceSol.size > 0)
        if (hasOverrides) {
          const auctionResult = runSdkRerun(
            TEST_AUCTION_RESULT.auctionData,
            TEST_DS_SAM_CONFIG,
            overrides,
          )
          return Promise.resolve({ ...SYNTHETIC_SAM_RESULT, auctionResult })
        }
        return Promise.resolve(samResultRef.current)
      },
      loadValidatorNames: () => Promise.resolve(state.validatorNames),
    }),
    [state.validatorNames],
  )

  if (!state.ready) {
    // Minimal loading state — keeps the nav rendered so EpochMeter doesn't
    // stall and the test's waitForSelector('tbody tr') gates on real data.
    return <div data-testid="loading-snapshot" style={{ padding: '2rem' }} />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SamPage level={level} dataSources={dataSources} />
    </QueryClientProvider>
  )
}

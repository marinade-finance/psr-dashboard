import { keepPreviousData, useQuery } from '@tanstack/react-query'
import React, { useMemo } from 'react'

import { ConcentrationSplit } from 'src/components/concentration-split/concentration-split'
import { FetchError } from 'src/components/fetch-error/fetch-error'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { selectConcentration } from 'src/services/concentration'
import {
  fetchNetworkConcentration,
  selectNetworkShares,
} from 'src/services/cluster-stats'
import { loadSam } from 'src/services/sam'

import type { UserLevelProps } from 'src/components/navigation/navigation'
import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'

type SamResult = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
}

export const ConcentrationPage: React.FC<UserLevelProps> = ({ level }) => {
  // Same ['sam'] key the SAM page and EpochMeter use, so arriving here from
  // the auction table costs no extra auction run.
  const { data, status } = useQuery<SamResult>({
    queryKey: ['sam'],
    queryFn: () => loadSam(),
    placeholderData: keepPreviousData,
  })

  // Network shares are context, not the subject: the page renders without
  // them, so this query never gates the SAM split behind its own loading or
  // error state.
  const { data: networkConcentration } = useQuery({
    queryKey: ['cluster-stats'],
    queryFn: ({ signal }) => fetchNetworkConcentration(signal),
    placeholderData: keepPreviousData,
  })

  // Both dimensions come from one auction result — the same stake split two
  // ways, so the totals always agree.
  const splits = useMemo(
    () =>
      data
        ? {
            aso: selectConcentration(
              data.auctionResult,
              data.dsSamConfig,
              'aso',
            ),
            country: selectConcentration(
              data.auctionResult,
              data.dsSamConfig,
              'country',
            ),
          }
        : null,
    [data],
  )

  const network = networkConcentration ?? null

  return (
    <div className="bg-background-page min-h-screen">
      <Navigation level={level} />
      {status === 'error' && (
        <FetchError
          title="Couldn't load the auction."
          detail="The concentration split is computed from the live SAM auction, which didn't load. Try reloading; if the problem persists, check the validators API status."
        />
      )}
      {status === 'pending' && <Loader />}
      {status === 'success' && splits && (
        <div className="px-4 py-4 space-y-8">
          <ConcentrationSplit
            concentration={splits.aso}
            networkShares={selectNetworkShares(network, 'aso')}
            level={level}
          />
          <ConcentrationSplit
            concentration={splits.country}
            networkShares={selectNetworkShares(network, 'country')}
            level={level}
          />
        </div>
      )}
    </div>
  )
}

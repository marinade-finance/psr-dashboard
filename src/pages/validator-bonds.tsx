import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import React, { useMemo } from 'react'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ValidatorBondsTable } from 'src/components/validator-bonds-table/validator-bonds-table'
import {
  fetchAllNotifications,
  fetchLatestSamAuctionBroadcastNotification,
} from 'src/services/notifications'
import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { selectTotalMarinadeStake } from 'src/services/validators'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ValidatorBondsPage: React.FC<UserLevelProps> = ({ level }) => {
  const queryClient = useQueryClient()
  const { data, status } = useQuery({
    queryKey: ['bonds'],
    queryFn: ({ signal }) => fetchValidatorsWithBonds(queryClient, signal),
    refetchInterval: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const { data: latestBroadcastNotification } = useQuery({
    queryKey: ['notifications-broadcast'],
    queryFn: ({ signal }) => fetchLatestSamAuctionBroadcastNotification(signal),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const { data: notificationsMap } = useQuery({
    queryKey: ['notifications-all', 'sam_auction'],
    queryFn: ({ signal }) => fetchAllNotifications('sam_auction', signal),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  const filteredData = useMemo(
    () =>
      data
        ? data.filter(
            ({ validator, bond }) =>
              selectTotalMarinadeStake(validator) > 0 ||
              Number(bond?.effective_amount) > 0,
          )
        : [],
    [data],
  )

  return (
    <div className="bg-background-page">
      <Navigation level={level} />
      <div className="px-4 py-4">
        {latestBroadcastNotification && (
          <Banner
            key={latestBroadcastNotification.id}
            title={latestBroadcastNotification.title ?? 'Announcement'}
            body={latestBroadcastNotification.message}
          />
        )}
      </div>
      {status === 'error' && (
        <div className="px-4 py-8 max-w-2xl mx-auto text-center">
          <p className="text-base font-medium text-destructive">
            Couldn&apos;t load validator bonds.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            The bonds API didn&apos;t respond. The page can&apos;t render
            without it. Try reloading; if the problem persists, check the
            validator-bonds API status.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Reload page
          </button>
        </div>
      )}
      {status === 'pending' && <Loader />}
      {status === 'success' && (
        <ValidatorBondsTable
          data={filteredData}
          level={level}
          notificationsMap={notificationsMap}
        />
      )}
    </div>
  )
}

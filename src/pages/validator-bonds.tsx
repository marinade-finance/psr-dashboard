import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import React, { useMemo } from 'react'

import { Banner } from 'src/components/banner/banner'
import { FetchError } from 'src/components/fetch-error/fetch-error'
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
        <FetchError
          title="Couldn't load validator bonds."
          detail="The bonds API didn't respond. The page can't render without it. Try reloading; if the problem persists, check the validator-bonds API status."
        />
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

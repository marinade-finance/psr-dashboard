import { keepPreviousData, useQuery } from '@tanstack/react-query'
import React from 'react'

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
  const { data, status } = useQuery({
    queryKey: ['bonds'],
    queryFn: fetchValidatorsWithBonds,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const { data: latestBroadcastNotification } = useQuery({
    queryKey: ['notifications-broadcast'],
    queryFn: fetchLatestSamAuctionBroadcastNotification,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const { data: notificationsMap } = useQuery({
    queryKey: ['notifications-all', 'sam_auction'],
    queryFn: () => fetchAllNotifications('sam_auction'),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

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
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'pending' && <Loader />}
      {status === 'success' && (
        <ValidatorBondsTable
          data={data.filter(
            ({ validator, bond }) =>
              selectTotalMarinadeStake(validator) > 0 ||
              Number(bond?.effective_amount) > 0,
          )}
          level={level}
          notificationsMap={notificationsMap}
        />
      )}
    </div>
  )
}

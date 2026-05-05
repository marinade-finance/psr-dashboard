import React from 'react'
import { useQuery } from 'react-query'

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
  const { data, status } = useQuery('bonds', fetchValidatorsWithBonds)
  const { data: latestBroadcastNotification } = useQuery(
    'notifications-broadcast',
    fetchLatestSamAuctionBroadcastNotification,
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  )
  const { data: notificationsMap } = useQuery(
    ['notifications-all', 'sam_auction'],
    () => fetchAllNotifications('sam_auction'),
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
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
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
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

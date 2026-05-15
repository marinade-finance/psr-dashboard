import { keepPreviousData, useQuery } from '@tanstack/react-query'
import React from 'react'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { fetchLatestSamAuctionBroadcastNotification } from 'src/services/notifications'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ProtectedEventsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery({
    queryKey: ['protected-events'],
    queryFn: fetchProtectedEventsWithValidator,
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
        <ProtectedEventsTable data={data} level={level} />
      )}
    </div>
  )
}

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import React from 'react'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { fetchLatestSamAuctionBroadcastNotification } from 'src/services/notifications'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ProtectedEventsPage: React.FC<UserLevelProps> = ({ level }) => {
  const queryClient = useQueryClient()
  const { data, status } = useQuery({
    queryKey: ['protected-events'],
    queryFn: ({ signal }) =>
      fetchProtectedEventsWithValidator(queryClient, signal),
    refetchInterval: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
  const { data: latestBroadcastNotification } = useQuery({
    queryKey: ['notifications-broadcast'],
    queryFn: ({ signal }) => fetchLatestSamAuctionBroadcastNotification(signal),
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
      {status === 'error' && (
        <div className="px-4 py-8 max-w-2xl mx-auto text-center">
          <p className="text-base font-medium text-destructive">
            Couldn&apos;t load protected events.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            The protected-events API didn&apos;t respond. The page can&apos;t
            render without it. Try reloading; if the problem persists, check
            the validator-bonds API status.
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
        <ProtectedEventsTable data={data} level={level} />
      )}
    </div>
  )
}

import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { fetchBroadcastNotifications } from 'src/services/notifications'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

import styles from './protected-events.module.css'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ProtectedEventsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery(
    'protected-events',
    fetchProtectedEventsWithValidator,
  )
  const { data: broadcastNotifications } = useQuery(
    'notifications-broadcast',
    fetchBroadcastNotifications,
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  )

  return (
    <div className={styles.page}>
      <Navigation level={level} />
      {broadcastNotifications?.map(n => (
        <Banner key={n.id} title={n.title ?? 'Announcement'} body={n.message} />
      ))}
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && (
        <ProtectedEventsTable data={data} level={level} />
      )}
    </div>
  )
}

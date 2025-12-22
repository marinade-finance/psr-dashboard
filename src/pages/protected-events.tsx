import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { getBannerData } from 'src/services/banner'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

import styles from './protected-events.module.css'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ProtectedEventsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery(
    'protected-events',
    fetchProtectedEventsWithValidator,
  )

  return (
    <div className={styles.page}>
      <Navigation level={level} />
      <Banner {...getBannerData()} />
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && (
        <ProtectedEventsTable data={data} level={level} />
      )}
    </div>
  )
}

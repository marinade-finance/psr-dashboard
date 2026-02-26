import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { PageLayout } from 'src/components/page-layout/page-layout'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { getBannerData } from 'src/services/banner'
import { fetchProtectedEventsWithValidator } from 'src/services/validator-with-protected_event'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ProtectedEventsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery(
    'protected-events',
    fetchProtectedEventsWithValidator,
  )

  return (
    <PageLayout level={level} title="Protected Events">
      <Banner {...getBannerData()} />
      {status === 'error' && (
        <p className="text-destructive text-center text-sm py-8">
          Error fetching data
        </p>
      )}
      {status === 'loading' && <Loader />}
      {status === 'success' && (
        <ProtectedEventsTable data={data} level={level} />
      )}
    </PageLayout>
  )
}

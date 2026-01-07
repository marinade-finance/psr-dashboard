import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { getBannerData } from 'src/services/banner'
import { loadSam } from 'src/services/sam'

import styles from './sam.module.css'

import type { UserLevel } from 'src/components/navigation/navigation'

type Props = {
  level: UserLevel
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const { data, status } = useQuery('sam', loadSam)

  return (
    <div className={styles.page}>
      <Navigation level={level} />
      <Banner {...getBannerData()} />
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && (
        <SamTable
          auctionResult={data.auctionResult}
          epochsPerYear={data.epochsPerYear}
          dsSamConfig={data.dcSamConfig}
          level={level}
        />
      )}
    </div>
  )
}

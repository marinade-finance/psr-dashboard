import React, { useMemo } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ClassicSamTable } from 'src/components/sam-table/sam-table-classic'
import { getBannerData } from 'src/services/banner'
import { loadSam } from 'src/services/sam'
import { fetchValidators } from 'src/services/validators'

import type { UserLevel } from 'src/components/navigation/navigation'

type Props = { level: UserLevel }

export const ClassicSamPage: React.FC<Props> = ({ level }) => {
  const { data, status } = useQuery(['sam', 0], () => loadSam(null), {
    keepPreviousData: true,
  })
  const { data: validatorsData } = useQuery('validators', fetchValidators)

  const nameMap = useMemo(() => {
    const map = new Map<string, { name: string; countryIso: string | null }>()
    if (!validatorsData) return map
    for (const v of validatorsData.validators) {
      map.set(v.vote_account, {
        name: v.info_name ?? '---',
        countryIso: v.dc_country_iso,
      })
    }
    return map
  }, [validatorsData])

  return (
    <div className="bg-background-page">
      <Navigation level={level} />
      <Banner {...getBannerData()} />
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && data?.auctionResult && (
        <ClassicSamTable
          auctionResult={data.auctionResult}
          epochsPerYear={data.epochsPerYear}
          dsSamConfig={data.dcSamConfig}
          level={level}
          validatorMeta={nameMap}
          tvlJoinApyDiff={data.tvlJoinApyDiff}
          tvlLeaveApyDiff={data.tvlLeaveApyDiff}
          backstopDiff={data.backstopDiff}
          backstopTvl={data.backstopTvl}
        />
      )}
    </div>
  )
}

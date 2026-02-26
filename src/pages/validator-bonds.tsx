import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { PageLayout } from 'src/components/page-layout/page-layout'
import { BondsSkeleton } from 'src/components/skeleton/skeleton'
import { ValidatorBondsTable } from 'src/components/validator-bonds-table/validator-bonds-table'
import { getBannerData } from 'src/services/banner'
import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { selectTotalMarinadeStake } from 'src/services/validators'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ValidatorBondsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery('bonds', fetchValidatorsWithBonds, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return (
    <PageLayout level={level} title="Validator Bonds">
      <Banner {...getBannerData()} />
      {status === 'error' && (
        <p className="text-destructive text-center text-sm py-8">
          Error fetching data
        </p>
      )}
      {status === 'loading' && <BondsSkeleton />}
      {status === 'success' && (
        <ValidatorBondsTable
          data={data.filter(
            ({ validator, bond }) =>
              selectTotalMarinadeStake(validator) > 0 ||
              Number(bond?.effective_amount) > 0,
          )}
          level={level}
        />
      )}
    </PageLayout>
  )
}

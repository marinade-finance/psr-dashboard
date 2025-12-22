import React from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { ValidatorBondsTable } from 'src/components/validator-bonds-table/validator-bonds-table'
import { getBannerData } from 'src/services/banner'
import { fetchValidatorsWithBonds } from 'src/services/validator-with-bond'
import { selectTotalMarinadeStake } from 'src/services/validators'

import styles from './validator-bonds.module.css'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const ValidatorBondsPage: React.FC<UserLevelProps> = ({ level }) => {
  const { data, status } = useQuery('bonds', fetchValidatorsWithBonds)

  return (
    <div className={styles.page}>
      <Navigation level={level} />
      <Banner {...getBannerData()} />
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
        />
      )}
    </div>
  )
}

import React from 'react'

import { BondsTable } from 'src/components/bonds-table/bonds-table'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { useTransformedBondData } from 'src/hooks/useDataQueries'

import styles from './bonds.module.css'

export const BondsPage: React.FC = () => {
  const { data, status } = useTransformedBondData()

  return (
    <div className={styles.page}>
      <Navigation />
      {status === 'error' && <p>Error fetching bonds data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && (
        <BondsTable validators={data.validators} apiApy={data.apiApy} />
      )}
    </div>
  )
}

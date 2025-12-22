import React, { useState } from 'react'

import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SelectTable } from 'src/components/select-table/select-table'
import { useTransformedSelectData } from 'src/hooks/useDataQueries'

import styles from './select.module.css'

export const SelectPage: React.FC = () => {
  const [fromEpoch, setFromEpoch] = useState<number | undefined>(undefined)
  const [toEpoch, setToEpoch] = useState<number | undefined>(undefined)

  const { data, status, isLoading } = useTransformedSelectData(
    fromEpoch,
    toEpoch,
  )

  return (
    <div className={styles.page}>
      <Navigation />
      {status === 'error' && <p>Error fetching Select data</p>}
      {(status === 'loading' || isLoading) && <Loader />}
      {status === 'success' && (
        <SelectTable
          validators={data.validators}
          fromEpoch={fromEpoch}
          toEpoch={toEpoch}
          onFromEpochChange={setFromEpoch}
          onToEpochChange={setToEpoch}
        />
      )}
    </div>
  )
}

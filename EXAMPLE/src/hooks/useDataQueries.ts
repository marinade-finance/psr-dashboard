import { useQuery } from 'react-query'

import {
  loadLatestBondData,
  loadSelectEpochData,
  checkAndBuildBondsData,
  checkAndBuildSelectData,
} from '../services/load-data'

import type { BondsTableData, SelectTableData } from '../services/load-data'

const useLatestBondData = () => {
  return useQuery(['latest-bond-data'], loadLatestBondData)
}

const useSelectEpochData = (fromEpoch?: number, toEpoch?: number) => {
  return useQuery(['select-epoch-data', fromEpoch, toEpoch], () =>
    loadSelectEpochData(fromEpoch, toEpoch),
  )
}

export const useTransformedBondData = (): {
  data: BondsTableData
  isLoading: boolean
  isError: boolean
  status: 'loading' | 'error' | 'success'
} => {
  const latestSelectQuery = useSelectEpochData(undefined, undefined)
  const latestBondQuery = useLatestBondData()

  const isLoading = latestBondQuery.isLoading || latestSelectQuery.isLoading
  const isError = latestBondQuery.isError || latestSelectQuery.isError

  let combinedData: BondsTableData = {
    validators: [],
    apiApy: { times: [], values: [], labels: [] },
  }
  if (latestBondQuery.data && latestSelectQuery.data) {
    combinedData = checkAndBuildBondsData(
      latestSelectQuery.data.validators,
      latestSelectQuery.data.validatorPayouts,
      latestBondQuery.data.apiApy,
      latestBondQuery.data.apiValidators.validators,
      latestBondQuery.data.bonds.bonds,
      latestBondQuery.data.mevData.validators,
    )
  }

  return {
    data: combinedData,
    isLoading,
    isError,
    status: isError ? 'error' : isLoading ? 'loading' : 'success',
  }
}

export const useTransformedSelectData = (
  fromEpoch?: number,
  toEpoch?: number,
): {
  data: SelectTableData
  isLoading: boolean
  isError: boolean
  status: 'loading' | 'error' | 'success'
} => {
  const epochSelectQuery = useSelectEpochData(fromEpoch, toEpoch)
  const isLoading = epochSelectQuery.isLoading
  const isError = epochSelectQuery.isError

  let combinedData: SelectTableData = { validators: [], allPayouts: [] }
  if (epochSelectQuery.data) {
    combinedData = checkAndBuildSelectData(
      epochSelectQuery.data.validators,
      epochSelectQuery.data.validatorPayouts,
    )
  }

  return {
    data: combinedData,
    isLoading,
    isError,
    status: isError ? 'error' : isLoading ? 'loading' : 'success',
  }
}

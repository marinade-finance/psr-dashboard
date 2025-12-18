import React, { useState, useCallback } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { getBannerData } from 'src/services/banner'
import { loadSam } from 'src/services/sam'

import styles from './sam.module.css'

import type { UserLevel } from 'src/components/navigation/navigation'
import type { SimulationInputs } from 'src/components/sam-table/sam-table'
import type { SourceDataOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

const buildSourceDataOverrides = (
  inputs: SimulationInputs,
): SourceDataOverrides | null => {
  if (!inputs.voteAccount) {
    return null
  }

  const overrides: SourceDataOverrides = {
    inflationCommissions: new Map(),
    mevCommissions: new Map(),
    blockRewardsCommissions: new Map(),
    cpmpes: new Map(),
  }

  if (inputs.inflationCommission !== null) {
    // User enters percentage (e.g., 5 for 5%), SDK expects value * 100 (e.g., 500 for 5%)
    overrides.inflationCommissions.set(
      inputs.voteAccount,
      inputs.inflationCommission * 100,
    )
  }
  if (inputs.mevCommission !== null) {
    // User enters percentage (e.g., 5 for 5%), SDK expects basis points (e.g., 500 for 5%)
    overrides.mevCommissions.set(inputs.voteAccount, inputs.mevCommission * 100)
  }
  if (inputs.blockRewardsCommission !== null) {
    // User enters percentage (e.g., 5 for 5%), SDK expects basis points (e.g., 500 for 5%)
    overrides.blockRewardsCommissions.set(
      inputs.voteAccount,
      inputs.blockRewardsCommission * 100,
    )
  }
  if (inputs.bidPmpe !== null) {
    // User enters SOL (e.g., 0.05), SDK expects lamports (e.g., 50000000)
    overrides.cpmpes.set(inputs.voteAccount, inputs.bidPmpe * 1e9)
  }

  return overrides
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)

  const {
    data,
    status,
    // isFetching,
  } = useQuery(
    ['sam', simulationOverrides],
    () => loadSam(simulationOverrides),
    {
      keepPreviousData: true,
      onSettled: () => setIsSimulationRunning(false),
    },
  )

  const handleRunSimulation = useCallback((inputs: SimulationInputs) => {
    const overrides = buildSourceDataOverrides(inputs)
    setIsSimulationRunning(true)
    setSimulationOverrides(overrides)
  }, [])

  const handleResetSimulation = useCallback(() => {
    setSimulationOverrides(null)
  }, [])

  const handleToggleSimulator = useCallback(() => {
    setShowSimulator(prev => !prev)
  }, [])

  const isSimulating = simulationOverrides !== null

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
          showSimulator={showSimulator}
          onToggleSimulator={handleToggleSimulator}
          onRunSimulation={handleRunSimulation}
          onResetSimulation={handleResetSimulation}
          isSimulating={isSimulating}
          isLoading={isSimulationRunning}
        />
      )}
    </div>
  )
}

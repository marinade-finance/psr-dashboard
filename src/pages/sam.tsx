import React, { useState, useCallback } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { getBannerData } from 'src/services/banner'
import { loadSam } from 'src/services/sam'

import styles from './sam.module.css'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

// Track pending edits before they're applied (for input field values)
export type PendingEdits = {
  inflationCommission?: string
  mevCommission?: string
  blockRewardsCommission?: string
  bidPmpe?: string
}

export const SamPage: React.FC<Props> = ({ level }) => {
  // Simulation mode is active (validators are clickable)
  const [simulationModeActive, setSimulationModeActive] = useState(false)
  // Which validator is currently being edited (null = none)
  const [editingValidator, setEditingValidator] = useState<string | null>(null)
  // Is a simulation calculation running
  const [isCalculating, setIsCalculating] = useState(false)
  // Counter to force cache invalidation
  const [simulationRunId, setSimulationRunId] = useState(0)
  // The actual overrides sent to the SDK (for the simulated validator)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  // Which validator has been simulated
  const [simulatedValidator, setSimulatedValidator] = useState<string | null>(
    null,
  )
  // Track pending input values (before simulation is run)
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({})

  // Original auction result (saved when entering simulation mode)
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  const {
    data,
    status,
    // isFetching,
  } = useQuery(['sam', simulationRunId], () => loadSam(simulationOverrides), {
    keepPreviousData: true,
    onSettled: () => setIsCalculating(false),
  })

  // Toggle simulation mode on/off
  const handleToggleSimulationMode = useCallback(() => {
    setSimulationModeActive(prev => {
      if (prev) {
        // Exiting simulation mode - reset everything
        setSimulationOverrides(null)
        setSimulatedValidator(null)
        setEditingValidator(null)
        setPendingEdits({})
        setOriginalAuctionResult(null)
        setSimulationRunId(id => id + 1)
      } else {
        // Entering simulation mode - save original results
        if (data?.auctionResult) {
          setOriginalAuctionResult(data.auctionResult)
        }
      }
      return !prev
    })
  }, [data])

  // Handle clicking on a validator row (when in simulation mode)
  const handleValidatorClick = useCallback(
    (voteAccount: string) => {
      if (!simulationModeActive) return

      // Don't allow clicking on the previously simulated validator (it shows old position)
      if (voteAccount === simulatedValidator) return

      // Start editing this validator
      setEditingValidator(voteAccount)
      setPendingEdits({})
    },
    [simulationModeActive, simulatedValidator],
  )

  // Handle input field changes (just update pending edits locally)
  const handleFieldChange = useCallback(
    (
      field:
        | 'inflationCommission'
        | 'mevCommission'
        | 'blockRewardsCommission'
        | 'bidPmpe',
      value: string,
    ) => {
      setPendingEdits(prev => ({
        ...prev,
        [field]: value,
      }))
    },
    [],
  )

  // Run simulation for the currently editing validator
  const handleRunSimulation = useCallback(() => {
    if (!editingValidator || !originalAuctionResult) return

    // Find the original validator data
    const originalValidator = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!originalValidator) return

    // Build overrides from pending edits
    const overrides: SourceDataOverrides = {
      inflationCommissions: new Map(),
      mevCommissions: new Map(),
      blockRewardsCommissions: new Map(),
      cpmpes: new Map(),
    }

    // Apply pending edits
    if (pendingEdits.inflationCommission !== undefined) {
      const value = parseFloat(pendingEdits.inflationCommission)
      if (!isNaN(value)) {
        overrides.inflationCommissions.set(editingValidator, value)
      }
    }

    if (pendingEdits.mevCommission !== undefined) {
      const value = parseFloat(pendingEdits.mevCommission)
      if (!isNaN(value)) {
        // mev commission is in bps
        overrides.mevCommissions.set(editingValidator, value * 100)
      }
    }

    if (pendingEdits.blockRewardsCommission !== undefined) {
      const value = parseFloat(pendingEdits.blockRewardsCommission)
      if (!isNaN(value)) {
        // block rewards commission is in bps
        overrides.blockRewardsCommissions.set(editingValidator, value * 100)
      }
    }

    if (pendingEdits.bidPmpe !== undefined) {
      const value = parseFloat(pendingEdits.bidPmpe)
      if (!isNaN(value)) {
        // User enters SOL, SDK expects lamports
        overrides.cpmpes.set(editingValidator, value * 1e9)
      }
    }

    setSimulationOverrides(overrides)
    setSimulatedValidator(editingValidator)
    setEditingValidator(null)
    setPendingEdits({})
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
  }, [editingValidator, pendingEdits, originalAuctionResult])

  const hasSimulationApplied = simulatedValidator !== null

  return (
    <div className={styles.page}>
      <div
        className={`${styles.pageContent} ${simulationModeActive ? styles.simulationMode : ''} ${isCalculating ? styles.calculating : ''}`}
      >
        <Navigation level={level} />
        <Banner {...getBannerData()} />
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' && (
          <SamTable
            auctionResult={data.auctionResult}
            originalAuctionResult={originalAuctionResult}
            epochsPerYear={data.epochsPerYear}
            dsSamConfig={data.dcSamConfig}
            level={level}
            simulationModeActive={simulationModeActive}
            onToggleSimulationMode={handleToggleSimulationMode}
            editingValidator={editingValidator}
            simulatedValidator={simulatedValidator}
            isCalculating={isCalculating}
            hasSimulationApplied={hasSimulationApplied}
            pendingEdits={pendingEdits}
            onValidatorClick={handleValidatorClick}
            onFieldChange={handleFieldChange}
            onRunSimulation={handleRunSimulation}
          />
        )}
      </div>
    </div>
  )
}

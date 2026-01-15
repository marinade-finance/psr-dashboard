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
    onSettled: () => {
      setIsCalculating(false)
      setEditingValidator(null)
      setPendingEdits({})
    },
  })

  // Toggle simulation mode on/off
  const handleToggleSimulationMode = useCallback(() => {
    setSimulationModeActive(prev => {
      if (prev) {
        // Exiting simulation mode - reset state but don't refetch
        // We'll use originalAuctionResult as display data
        setSimulationOverrides(null)
        setSimulatedValidator(null)
        setEditingValidator(null)
        setPendingEdits({})
        // Don't clear originalAuctionResult - we need it for display
        // Don't increment simulationRunId - no need to refetch
      } else {
        // Entering simulation mode - save original results only if not already cached
        // (if cached, it means we just exited and re-entered without refetch)
        if (!originalAuctionResult && data?.auctionResult) {
          setOriginalAuctionResult(data.auctionResult)
        }
      }
      return !prev
    })
  }, [data, originalAuctionResult])

  // Handle clicking on a validator row (when in simulation mode)
  const handleValidatorClick = useCallback(
    (voteAccount: string) => {
      if (!simulationModeActive) return

      // Toggle off if clicking the same validator
      if (voteAccount === editingValidator) {
        setEditingValidator(null)
        setPendingEdits({})
        return
      }

      // Start editing this validator
      setEditingValidator(voteAccount)
      setPendingEdits({})
    },
    [simulationModeActive, editingValidator],
  )

  // Cancel editing without running simulation
  const handleCancelEditing = useCallback(() => {
    setEditingValidator(null)
    setPendingEdits({})
  }, [])

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
    if (!editingValidator || !originalAuctionResult || !data) return

    // Find the CURRENT validator (with displayed/simulated values)
    const currentValidator = data.auctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!currentValidator) return

    // Build overrides using displayed values (current data merged with pending edits)
    // This ensures that when re-editing a simulated validator, we preserve previous changes
    const overrides: SourceDataOverrides = {
      inflationCommissions: new Map(),
      mevCommissions: new Map(),
      blockRewardsCommissions: new Map(),
      cpmpes: new Map(),
    }

    // Inflation commission: use pending edit or current displayed value
    const inflationValue =
      pendingEdits.inflationCommission !== undefined
        ? parseFloat(pendingEdits.inflationCommission)
        : currentValidator.inflationCommissionDec * 100
    if (!isNaN(inflationValue)) {
      overrides.inflationCommissions.set(editingValidator, inflationValue)
    }

    // MEV commission: use pending edit or current displayed value
    const mevValue =
      pendingEdits.mevCommission !== undefined
        ? parseFloat(pendingEdits.mevCommission)
        : currentValidator.mevCommissionDec !== null
          ? currentValidator.mevCommissionDec * 100
          : NaN
    if (!isNaN(mevValue)) {
      // mev commission is in bps
      overrides.mevCommissions.set(editingValidator, mevValue * 100)
    }

    // Block rewards commission: use pending edit or current displayed value
    const blockValue =
      pendingEdits.blockRewardsCommission !== undefined
        ? parseFloat(pendingEdits.blockRewardsCommission)
        : currentValidator.blockRewardsCommissionDec !== null
          ? currentValidator.blockRewardsCommissionDec * 100
          : NaN
    if (!isNaN(blockValue)) {
      // block rewards commission is in bps
      overrides.blockRewardsCommissions.set(editingValidator, blockValue * 100)
    }

    // Bid PMPE: use pending edit or current displayed value
    const bidValue =
      pendingEdits.bidPmpe !== undefined
        ? parseFloat(pendingEdits.bidPmpe)
        : currentValidator.revShare.bidPmpe
    if (!isNaN(bidValue)) {
      // User enters SOL, SDK expects lamports
      overrides.cpmpes.set(editingValidator, bidValue * 1e9)
    }

    setSimulationOverrides(overrides)
    setSimulatedValidator(editingValidator)
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
    // editingValidator and pendingEdits are cleared in onSettled when calculation completes
  }, [editingValidator, pendingEdits, originalAuctionResult, data])

  const hasSimulationApplied = simulatedValidator !== null

  // When simulation mode is off but we have cached original data, use it
  // This avoids refetching when exiting simulation mode
  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? data?.auctionResult
      : originalAuctionResult

  return (
    <div className={styles.page}>
      <div className={styles.pageContent}>
        <Navigation level={level} />
        <Banner {...getBannerData()} />
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' && displayAuctionResult && (
          <SamTable
            auctionResult={displayAuctionResult}
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
            onCancelEditing={handleCancelEditing}
          />
        )}
      </div>
    </div>
  )
}

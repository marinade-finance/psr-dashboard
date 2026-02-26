import React, { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'react-query'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { SamSkeleton } from 'src/components/skeleton/skeleton'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import { loadSam, selectBondSize } from 'src/services/sam'

import type {
  AuctionResult,
  AuctionValidator,
} from '@marinade.finance/ds-sam-sdk'
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

  // Selected validator for detail view (null = closed)
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )

  const {
    data,
    status,
    // isFetching,
  } = useQuery(['sam', simulationRunId], () => loadSam(simulationOverrides), {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
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
      if (!simulationModeActive) {
        // Not in simulation mode - open detail view
        setSelectedValidator(voteAccount)
        return
      }

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

  // Close validator detail view
  const handleCloseDetail = useCallback(() => {
    setSelectedValidator(null)
  }, [])

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

  // Handle simulation from detail view
  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator || !data) return

      const overrides: SourceDataOverrides = {
        inflationCommissions: new Map(),
        mevCommissions: new Map(),
        blockRewardsCommissions: new Map(),
        cpmpes: new Map(),
      }

      if (inflationCommission !== null) {
        overrides.inflationCommissions.set(
          selectedValidator,
          inflationCommission * 100,
        )
      }
      if (mevCommission !== null) {
        overrides.mevCommissions.set(selectedValidator, mevCommission * 10000)
      }
      if (blockRewardsCommission !== null) {
        overrides.blockRewardsCommissions.set(
          selectedValidator,
          blockRewardsCommission * 10000,
        )
      }
      if (bidPmpe !== null) {
        overrides.cpmpes.set(selectedValidator, bidPmpe * 1e9)
      }

      if (!originalAuctionResult && data?.auctionResult) {
        setOriginalAuctionResult(data.auctionResult)
      }

      setSimulationOverrides(overrides)
      setSimulatedValidator(selectedValidator)
      setSimulationModeActive(true)
      setIsCalculating(true)
      setSimulationRunId(prev => prev + 1)
    },
    [selectedValidator, data, originalAuctionResult],
  )

  const hasSimulationApplied = simulatedValidator !== null

  // When simulation mode is off but we have cached original data, use it
  // This avoids refetching when exiting simulation mode
  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? data?.auctionResult
      : originalAuctionResult

  // Get selected validator data and compute rank
  const selectedValidatorData = useMemo((): {
    validator: AuctionValidator
    rank: number
    totalValidators: number
  } | null => {
    if (!selectedValidator || !displayAuctionResult) return null

    const validators = displayAuctionResult.auctionData.validators
      .filter(v => selectBondSize(v) > 0)
      .sort(
        (a, b) =>
          b.auctionStake.marinadeSamTargetSol -
          a.auctionStake.marinadeSamTargetSol,
      )

    const index = validators.findIndex(v => v.voteAccount === selectedValidator)
    if (index === -1) return null

    return {
      validator: validators[index],
      rank: index + 1,
      totalValidators: validators.length,
    }
  }, [selectedValidator, displayAuctionResult])

  return (
    <div className="min-h-screen bg-background-page">
      <div className="relative max-w-[1600px] mx-auto">
        <Navigation level={level} />
        {/* Page header row with title and action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-semibold text-foreground font-sans">
              Stake Auction Marketplace
            </span>
            <span className="text-[13px] text-muted-foreground font-sans">
              Epoch 924 · Per-validator cap: 8% of TVL (MIP-19)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {hasSimulationApplied && !isCalculating && (
              <span className="text-xs text-info font-sans font-medium">
                Simulation applied
              </span>
            )}
            {isCalculating && (
              <span className="text-xs text-info font-sans font-medium">
                Calculating...
              </span>
            )}
            <button
              className={`px-4 py-2 rounded-lg text-[13px] font-medium font-sans transition-all disabled:opacity-60 disabled:cursor-not-allowed ${simulationModeActive ? 'bg-info text-white border border-info hover:brightness-90' : 'border border-border bg-secondary text-secondary-foreground hover:bg-tertiary hover:text-foreground'}`}
              onClick={handleToggleSimulationMode}
              disabled={isCalculating}
            >
              {simulationModeActive ? 'Exit What-If' : 'What-If Mode'}
            </button>
            <HelpTip text="Test how changing your bid or commission would affect your auction ranking. Click any validator row to edit parameters." />
          </div>
        </div>
        {status === 'error' && (
          <p className="text-destructive p-6 text-center text-sm">
            Error fetching data
          </p>
        )}
        {status === 'loading' && <SamSkeleton />}
        {status === 'success' && displayAuctionResult && (
          <div className="p-6">
            <SamTable
              auctionResult={displayAuctionResult}
              originalAuctionResult={originalAuctionResult}
              epochsPerYear={data.epochsPerYear}
              dsSamConfig={data.dcSamConfig}
              level={level}
              simulationModeActive={simulationModeActive}
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
          </div>
        )}
      </div>

      {selectedValidatorData && data && (
        <ValidatorDetail
          validator={selectedValidatorData.validator}
          auctionResult={displayAuctionResult}
          dsSamConfig={data.dcSamConfig}
          epochsPerYear={data.epochsPerYear}
          rank={selectedValidatorData.rank}
          totalValidators={selectedValidatorData.totalValidators}
          onClose={handleCloseDetail}
          onSimulate={handleDetailSimulate}
          isCalculating={isCalculating}
        />
      )}
    </div>
  )
}

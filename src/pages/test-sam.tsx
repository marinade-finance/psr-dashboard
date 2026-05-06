import React, { useState, useCallback, useMemo } from 'react'

import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
  TEST_EPOCHS_PER_YEAR,
  TEST_VALIDATOR_NAMES,
} from 'src/fixtures/test-validators'
import { augmentAuctionResult, selectBondSize } from 'src/services/sam'
import {
  buildOverrideValues,
  mergeOverrides,
  removeFromOverrides,
} from 'src/services/simulation'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'
import type { PendingEdits } from 'src/services/simulation'

type Props = {
  level: UserLevel
}

export const TestSamPage: React.FC<Props> = ({ level }) => {
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )
  const [simulationModeActive, setSimulationModeActive] = useState(false)
  const [editingValidator, setEditingValidator] = useState<string | null>(null)
  const [isCalculating] = useState(false)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [simulatedValidators, setSimulatedValidators] = useState<Set<string>>(
    new Set(),
  )
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({})
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  // Static fixture data — no API calls
  const auctionResult = TEST_AUCTION_RESULT

  const nameMap = useMemo(() => {
    const map = new Map<string, { name?: string; countryIso?: string | null }>()
    for (const [vote, name] of TEST_VALIDATOR_NAMES) {
      map.set(vote, { name })
    }
    return map
  }, [])

  const ensureOriginalSaved = useCallback(() => {
    if (!originalAuctionResult) {
      setOriginalAuctionResult(auctionResult)
      return auctionResult
    }
    return originalAuctionResult
  }, [originalAuctionResult, auctionResult])

  const handleResetSimulation = useCallback(() => {
    setSimulationOverrides(null)
    setSimulatedValidators(new Set())
    setSimulationModeActive(false)
    setEditingValidator(null)
    setPendingEdits({})
    setOriginalAuctionResult(null)
  }, [])

  const handleClearValidator = useCallback(
    (voteAccount: string) => {
      const next = removeFromOverrides(simulationOverrides, voteAccount)
      setSimulationOverrides(next)
      setSimulatedValidators(prev => {
        const s = new Set(prev)
        s.delete(voteAccount)
        if (s.size === 0) {
          setSimulationModeActive(false)
          setOriginalAuctionResult(null)
          setSimulationOverrides(null)
        }
        return s
      })
    },
    [simulationOverrides],
  )

  const handleToggleSimulationMode = useCallback(() => {
    if (simulationModeActive) {
      handleResetSimulation()
    } else {
      ensureOriginalSaved()
      setSimulationModeActive(true)
    }
  }, [simulationModeActive, handleResetSimulation, ensureOriginalSaved])

  const handleValidatorClick = useCallback(
    (voteAccount: string) => {
      if (simulationModeActive) {
        if (voteAccount === editingValidator) {
          setEditingValidator(null)
          setPendingEdits({})
          return
        }
        setEditingValidator(voteAccount)
        setPendingEdits({})
        return
      }
      setSelectedValidator(voteAccount)
    },
    [simulationModeActive, editingValidator],
  )

  const handleBack = useCallback(() => {
    setSelectedValidator(null)
  }, [])

  const handleCancelEditing = useCallback(() => {
    setEditingValidator(null)
    setPendingEdits({})
  }, [])

  const handleFieldChange = useCallback(
    (field: keyof PendingEdits, value: string) =>
      setPendingEdits(prev => ({ ...prev, [field]: value })),
    [],
  )

  const handleRunSimulation = useCallback(() => {
    if (!editingValidator) return
    const current = auctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!current) return

    const overrides = buildOverrideValues(current, pendingEdits)
    ensureOriginalSaved()
    const next = mergeOverrides(
      simulationOverrides,
      editingValidator,
      overrides,
    )
    setSimulationOverrides(next)
    setSimulatedValidators(prev => new Set([...prev, editingValidator]))
  }, [
    editingValidator,
    pendingEdits,
    simulationOverrides,
    auctionResult,
    ensureOriginalSaved,
  ])

  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator) return
      ensureOriginalSaved()
      const next = mergeOverrides(simulationOverrides, selectedValidator, {
        inflationCommissionDec: inflationCommission,
        mevCommissionDec: mevCommission,
        blockRewardsCommissionDec: blockRewardsCommission,
        bidPmpe,
      })
      setSimulationOverrides(next)
      setSimulatedValidators(prev => new Set([...prev, selectedValidator]))
    },
    [selectedValidator, simulationOverrides, ensureOriginalSaved],
  )

  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? auctionResult
      : originalAuctionResult

  const sheetValidatorData = useMemo(() => {
    if (!selectedValidator || !displayAuctionResult) return null
    const augmented = augmentAuctionResult(displayAuctionResult)
    const validators = augmented
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
    <div className="bg-background-page">
      <Navigation level={level} />
      <SamTable
        auctionResult={displayAuctionResult}
        originalAuctionResult={originalAuctionResult}
        epochsPerYear={TEST_EPOCHS_PER_YEAR}
        dsSamConfig={TEST_DS_SAM_CONFIG}
        level={level}
        simulationModeActive={simulationModeActive}
        editingValidator={editingValidator}
        simulatedValidators={simulatedValidators}
        isCalculating={isCalculating}
        pendingEdits={pendingEdits}
        validatorMeta={nameMap}
        onValidatorClick={handleValidatorClick}
        onFieldChange={handleFieldChange}
        onRunSimulation={handleRunSimulation}
        onCancelEditing={handleCancelEditing}
        onToggleSimulation={handleToggleSimulationMode}
        onClearValidator={handleClearValidator}
        onResetSimulation={handleResetSimulation}
      />
      {sheetValidatorData && (
        <ValidatorDetail
          validator={sheetValidatorData.validator}
          auctionResult={displayAuctionResult}
          dsSamConfig={TEST_DS_SAM_CONFIG}
          epochsPerYear={TEST_EPOCHS_PER_YEAR}
          nameMap={nameMap}
          rank={sheetValidatorData.rank}
          totalValidators={sheetValidatorData.totalValidators}
          isSimulated={simulatedValidators.has(selectedValidator ?? '')}
          onClose={handleBack}
          onSimulate={handleDetailSimulate}
          onClearSimulation={
            simulatedValidators.has(selectedValidator ?? '') &&
            selectedValidator
              ? () => handleClearValidator(selectedValidator)
              : undefined
          }
          isCalculating={isCalculating}
        />
      )}
    </div>
  )
}

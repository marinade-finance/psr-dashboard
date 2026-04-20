import React, { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import { getBannerData } from 'src/services/banner'
import {
  buildExpectedStakeChanges,
  loadSam,
  selectBondSize,
} from 'src/services/sam'
import {
  buildOverrideValues,
  mergeOverrides,
  removeFromOverrides,
} from 'src/services/simulation'
import { fetchValidators } from 'src/services/validators'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'
import type { PendingEdits } from 'src/services/simulation'

type Props = {
  level: UserLevel
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )
  const [simulationModeActive, setSimulationModeActive] = useState(false)
  const [editingValidator, setEditingValidator] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [simulationRunId, setSimulationRunId] = useState(0)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [simulatedValidators, setSimulatedValidators] = useState<Set<string>>(
    new Set(),
  )
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({})
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  const { data, status } = useQuery(
    ['sam', simulationRunId],
    () => loadSam(simulationOverrides),
    {
      keepPreviousData: true,
      onSettled: () => {
        setIsCalculating(false)
        setEditingValidator(null)
        setPendingEdits({})
      },
    },
  )

  const { data: validatorsData } = useQuery('validators', fetchValidators)

  const nameMap = useMemo(() => {
    const map = new Map<string, { name: string; countryIso: string | null }>()
    if (!validatorsData) return map
    for (const v of validatorsData.validators) {
      map.set(v.vote_account, {
        name: v.info_name ?? '---',
        countryIso: v.dc_country_iso,
      })
    }
    return map
  }, [validatorsData])

  const ensureOriginalSaved = useCallback(() => {
    if (!originalAuctionResult && data?.auctionResult) {
      setOriginalAuctionResult(data.auctionResult)
      return data.auctionResult
    }
    return originalAuctionResult
  }, [originalAuctionResult, data])

  const handleResetSimulation = useCallback(() => {
    setSimulationOverrides(null)
    setSimulatedValidators(new Set())
    setSimulationModeActive(false)
    setEditingValidator(null)
    setPendingEdits({})
    setOriginalAuctionResult(null)
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
  }, [])

  const handleClearValidator = useCallback(
    (voteAccount: string) => {
      const next = removeFromOverrides(simulationOverrides, voteAccount)
      setSimulationOverrides(next)
      setSimulatedValidators(prev => {
        const s = new Set(prev)
        s.delete(voteAccount)
        if (s.size === 0) {
          // All cleared — full reset
          setSimulationModeActive(false)
          setOriginalAuctionResult(null)
          setSimulationOverrides(null)
        }
        return s
      })
      setIsCalculating(true)
      setSimulationRunId(prev => prev + 1)
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
    if (!editingValidator || !data) return
    const current = data.auctionResult.auctionData.validators.find(
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
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
  }, [
    editingValidator,
    pendingEdits,
    simulationOverrides,
    data,
    ensureOriginalSaved,
  ])

  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator || !data) return
      ensureOriginalSaved()
      const next = mergeOverrides(simulationOverrides, selectedValidator, {
        inflationCommissionDec: inflationCommission,
        mevCommissionDec: mevCommission,
        blockRewardsCommissionDec: blockRewardsCommission,
        bidPmpe,
      })
      setSimulationOverrides(next)
      setSimulatedValidators(prev => new Set([...prev, selectedValidator]))
      setIsCalculating(true)
      setSimulationRunId(prev => prev + 1)
    },
    [selectedValidator, data, simulationOverrides, ensureOriginalSaved],
  )

  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? data?.auctionResult
      : originalAuctionResult

  const stakeChanges = useMemo(() => {
    if (!displayAuctionResult) return undefined
    const { validators, stakeAmounts } = displayAuctionResult.auctionData
    return buildExpectedStakeChanges(validators, stakeAmounts.marinadeSamTvlSol)
  }, [displayAuctionResult])

  const sheetValidatorData = useMemo(() => {
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
    <div className="bg-background-page">
      <Navigation level={level} />
      <div className="px-4 py-4">
        <Banner {...getBannerData()} />
      </div>
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
          editingValidator={editingValidator}
          simulatedValidators={simulatedValidators}
          isCalculating={isCalculating}
          pendingEdits={pendingEdits}
          validatorMeta={nameMap}
          stakeChanges={stakeChanges}
          onValidatorClick={handleValidatorClick}
          onFieldChange={handleFieldChange}
          onRunSimulation={handleRunSimulation}
          onCancelEditing={handleCancelEditing}
          onToggleSimulation={handleToggleSimulationMode}
          onClearValidator={handleClearValidator}
          onResetSimulation={handleResetSimulation}
        />
      )}
      {status === 'success' &&
        displayAuctionResult &&
        sheetValidatorData &&
        data && (
          <ValidatorDetail
            validator={sheetValidatorData.validator}
            auctionResult={displayAuctionResult}
            dsSamConfig={data.dcSamConfig}
            epochsPerYear={data.epochsPerYear}
            nameMap={nameMap}
            rank={sheetValidatorData.rank}
            totalValidators={sheetValidatorData.totalValidators}
            onClose={handleBack}
            onSimulate={handleDetailSimulate}
            onClearSimulation={
              simulatedValidators.has(selectedValidator ?? '')
                ? () => handleClearValidator(selectedValidator)
                : undefined
            }
            isCalculating={isCalculating}
          />
        )}
    </div>
  )
}

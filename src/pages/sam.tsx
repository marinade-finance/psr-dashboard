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

export type PendingEdits = {
  inflationCommission?: string
  mevCommission?: string
  blockRewardsCommission?: string
  bidPmpe?: string
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const [simulationModeActive, setSimulationModeActive] = useState(false)
  const [editingValidator, setEditingValidator] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [simulationRunId, setSimulationRunId] = useState(0)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [simulatedValidator, setSimulatedValidator] = useState<string | null>(
    null,
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

  const handleToggleSimulationMode = useCallback(() => {
    setSimulationModeActive(prev => {
      if (prev) {
        setSimulationOverrides(null)
        setSimulatedValidator(null)
        setEditingValidator(null)
        setPendingEdits({})
      } else if (!originalAuctionResult && data?.auctionResult) {
        setOriginalAuctionResult(data.auctionResult)
      }
      return !prev
    })
  }, [data, originalAuctionResult])

  const handleValidatorClick = useCallback(
    (voteAccount: string) => {
      if (!simulationModeActive) return
      if (voteAccount === editingValidator) {
        setEditingValidator(null)
        setPendingEdits({})
        return
      }
      setEditingValidator(voteAccount)
      setPendingEdits({})
    },
    [simulationModeActive, editingValidator],
  )

  const handleCancelEditing = useCallback(() => {
    setEditingValidator(null)
    setPendingEdits({})
  }, [])

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

  const handleRunSimulation = useCallback(() => {
    if (!editingValidator || !originalAuctionResult || !data) return
    const currentValidator = data.auctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!currentValidator) return

    // Merge pending edits with current displayed values to preserve previous simulation changes
    const overrides: SourceDataOverrides = {
      inflationCommissions: new Map(),
      mevCommissions: new Map(),
      blockRewardsCommissions: new Map(),
      cpmpes: new Map(),
    }

    const inflationValue =
      pendingEdits.inflationCommission !== undefined
        ? parseFloat(pendingEdits.inflationCommission)
        : currentValidator.inflationCommissionDec * 100
    if (!isNaN(inflationValue)) {
      overrides.inflationCommissions.set(editingValidator, inflationValue)
    }

    const mevValue =
      pendingEdits.mevCommission !== undefined
        ? parseFloat(pendingEdits.mevCommission)
        : currentValidator.mevCommissionDec !== null
          ? currentValidator.mevCommissionDec * 100
          : NaN
    if (!isNaN(mevValue)) {
      overrides.mevCommissions.set(editingValidator, mevValue * 100) // bps
    }

    const blockValue =
      pendingEdits.blockRewardsCommission !== undefined
        ? parseFloat(pendingEdits.blockRewardsCommission)
        : currentValidator.blockRewardsCommissionDec !== null
          ? currentValidator.blockRewardsCommissionDec * 100
          : NaN
    if (!isNaN(blockValue)) {
      overrides.blockRewardsCommissions.set(editingValidator, blockValue * 100) // bps
    }

    const bidValue =
      pendingEdits.bidPmpe !== undefined
        ? parseFloat(pendingEdits.bidPmpe)
        : currentValidator.revShare.bidPmpe
    if (!isNaN(bidValue)) {
      overrides.cpmpes.set(editingValidator, bidValue * 1e9) // SOL -> lamports
    }

    setSimulationOverrides(overrides)
    setSimulatedValidator(editingValidator)
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
  }, [editingValidator, pendingEdits, originalAuctionResult, data])

  // Use cached original when simulation mode is off to avoid refetching
  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? data?.auctionResult
      : originalAuctionResult

  return (
    <div className={styles.page}>
      <div className={styles.pageContent}>
        <Navigation level={level}>
          <button
            className={`${styles.simulatorToggle} ${simulationModeActive ? styles.simulatorToggleActive : ''}`}
            onClick={handleToggleSimulationMode}
            disabled={isCalculating}
          >
            {simulationModeActive ? 'Exit Simulation' : 'Enter Simulation'}
          </button>
        </Navigation>
        <Banner {...getBannerData()} />
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' && displayAuctionResult && (
          <SamTable
            auctionResult={displayAuctionResult}
            tvlJoinApyDiff={data.tvlJoinApyDiff}
            tvlLeaveApyDiff={data.tvlLeaveApyDiff}
            backstopDiff={data.backstopDiff}
            backstopTvl={data.backstopTvl}
            originalAuctionResult={originalAuctionResult}
            epochsPerYear={data.epochsPerYear}
            dsSamConfig={data.dcSamConfig}
            level={level}
            simulationModeActive={simulationModeActive}
            editingValidator={editingValidator}
            simulatedValidator={simulatedValidator}
            isCalculating={isCalculating}
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

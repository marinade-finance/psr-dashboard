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
import type { SourceDataOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

// Track which validators have been edited (for bold/italic styling)
export type EditedValidators = Set<string>

// Track pending edits before they're applied (for input field values)
export type PendingEdits = Map<
  string,
  {
    inflationCommission?: string
    mevCommission?: string
    blockRewardsCommission?: string
    bidPmpe?: string
  }
>

export const SamPage: React.FC<Props> = ({ level }) => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  // Counter to force cache invalidation - Maps don't serialize properly with JSON.stringify
  const [simulationRunId, setSimulationRunId] = useState(0)
  // The actual overrides sent to the SDK
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  // Track which validators have been edited
  const [editedValidators, setEditedValidators] = useState<EditedValidators>(
    new Set(),
  )
  // Track pending input values (before blur triggers recalculation)
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>(new Map())

  const {
    data,
    status,
    // isFetching,
  } = useQuery(['sam', simulationRunId], () => loadSam(simulationOverrides), {
    keepPreviousData: true,
    onSettled: () => setIsSimulationRunning(false),
  })

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      if (prev) {
        // Exiting edit mode - reset everything
        setSimulationOverrides(null)
        setEditedValidators(new Set())
        setPendingEdits(new Map())
        setSimulationRunId(id => id + 1)
      }
      return !prev
    })
  }, [])

  // Handle input field changes (just update pending edits, don't recalculate yet)
  const handleFieldChange = useCallback(
    (
      voteAccount: string,
      field:
        | 'inflationCommission'
        | 'mevCommission'
        | 'blockRewardsCommission'
        | 'bidPmpe',
      value: string,
    ) => {
      setPendingEdits(prev => {
        const next = new Map(prev)
        const existing = next.get(voteAccount) || {}
        next.set(voteAccount, { ...existing, [field]: value })
        return next
      })
    },
    [],
  )

  // Handle blur - apply pending edits and trigger recalculation
  const handleFieldBlur = useCallback(
    (
      voteAccount: string,
      field:
        | 'inflationCommission'
        | 'mevCommission'
        | 'blockRewardsCommission'
        | 'bidPmpe',
      value: string,
      originalValue: number | null,
    ) => {
      const numValue = value === '' ? null : parseFloat(value)

      // Check if value actually changed from original
      const hasChanged =
        numValue !== originalValue &&
        !(numValue === null && originalValue === null)

      if (!hasChanged) {
        return
      }

      // Build new overrides
      setSimulationOverrides(prev => {
        const overrides: SourceDataOverrides = prev
          ? {
              inflationCommissions: new Map(prev.inflationCommissions),
              mevCommissions: new Map(prev.mevCommissions),
              blockRewardsCommissions: new Map(prev.blockRewardsCommissions),
              cpmpes: new Map(prev.cpmpes),
            }
          : {
              inflationCommissions: new Map(),
              mevCommissions: new Map(),
              blockRewardsCommissions: new Map(),
              cpmpes: new Map(),
            }

        if (field === 'inflationCommission') {
          if (numValue !== null) {
            // inflaction commission is calculated in percentage (e.g., 5 for 5%)
            overrides.inflationCommissions.set(voteAccount, numValue)
          } else {
            overrides.inflationCommissions.delete(voteAccount)
          }
        } else if (field === 'mevCommission') {
          if (numValue !== null) {
            // mev commission is calculated in bps (e.g., 500 for 5%)
            overrides.mevCommissions.set(voteAccount, numValue * 100)
          } else {
            overrides.mevCommissions.delete(voteAccount)
          }
        } else if (field === 'blockRewardsCommission') {
          if (numValue !== null) {
            // block rewards commission is calculated in bps (e.g., 500 for 5%)
            overrides.blockRewardsCommissions.set(voteAccount, numValue * 100)
          } else {
            overrides.blockRewardsCommissions.delete(voteAccount)
          }
        } else if (field === 'bidPmpe') {
          if (numValue !== null) {
            // User enters SOL (e.g., 0.05 means 0.05 SOL per mil), SDK expects lamports
            overrides.cpmpes.set(voteAccount, numValue * 1e9)
          } else {
            overrides.cpmpes.delete(voteAccount)
          }
        }

        return overrides
      })

      // Mark validator as edited
      setEditedValidators(prev => {
        const next = new Set(prev)
        next.add(voteAccount)
        return next
      })

      // Trigger recalculation
      setIsSimulationRunning(true)
      setSimulationRunId(prev => prev + 1)
    },
    [],
  )

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
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          isSimulating={isSimulating}
          isLoading={isSimulationRunning}
          editedValidators={editedValidators}
          pendingEdits={pendingEdits}
          onFieldChange={handleFieldChange}
          onFieldBlur={handleFieldBlur}
        />
      )}
    </div>
  )
}

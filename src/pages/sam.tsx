import React, { useState, useCallback } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import {
  fetchAllNotifications,
  fetchBroadcastNotifications,
} from 'src/services/notifications'
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

  const { data: notificationsMap } = useQuery(
    ['notifications-all', 'sam_auction'],
    () => fetchAllNotifications('sam_auction'),
    {
      refetchInterval: 5 * 60 * 1000, // refresh every 5 min
      keepPreviousData: true,
    },
  )

  const { data: broadcastNotifications } = useQuery(
    'notifications-broadcast',
    fetchBroadcastNotifications,
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
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
      if (!simulationModeActive) {
        return
      }
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
    (field: keyof PendingEdits, value: string) =>
      setPendingEdits(prev => ({ ...prev, [field]: value })),
    [],
  )

  const handleRunSimulation = useCallback(() => {
    if (!editingValidator || !originalAuctionResult || !data) {
      return
    }
    const current = data.auctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!current) {
      return
    }

    const resolveDec = (
      edit: string | undefined,
      fallbackDec: number | null,
    ): number =>
      edit !== undefined
        ? parseFloat(edit) / 100
        : fallbackDec !== null
          ? fallbackDec
          : NaN

    const overrides: SourceDataOverrides = {
      inflationCommissionsDec: new Map(),
      mevCommissionsDec: new Map(),
      blockRewardsCommissionsDec: new Map(),
      cpmpesDec: new Map(),
    }

    const infl = resolveDec(
      pendingEdits.inflationCommission,
      current.inflationCommissionDec,
    )
    if (!isNaN(infl)) {
      overrides.inflationCommissionsDec.set(editingValidator, infl)
    }

    const mev = resolveDec(pendingEdits.mevCommission, current.mevCommissionDec)
    if (!isNaN(mev)) {
      overrides.mevCommissionsDec.set(editingValidator, mev)
    }

    const blk = resolveDec(
      pendingEdits.blockRewardsCommission,
      current.blockRewardsCommissionDec,
    )
    if (!isNaN(blk)) {
      overrides.blockRewardsCommissionsDec.set(editingValidator, blk)
    }

    const bid =
      pendingEdits.bidPmpe !== undefined
        ? parseFloat(pendingEdits.bidPmpe)
        : current.revShare.bidPmpe
    if (!isNaN(bid)) {
      overrides.cpmpesDec.set(editingValidator, bid)
    }

    setSimulationOverrides(overrides)
    setSimulatedValidator(editingValidator)
    setIsCalculating(true)
    setSimulationRunId(prev => prev + 1)
  }, [editingValidator, pendingEdits, originalAuctionResult, data])

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
        {broadcastNotifications?.map(n => (
          <Banner
            key={n.id}
            title={n.title ?? 'Announcement'}
            body={n.message}
          />
        ))}
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' && displayAuctionResult && (
          <SamTable
            auctionResult={displayAuctionResult}
            tvlJoinApyDiff={data.tvlJoinApyDiff}
            tvlLeaveApyDiff={data.tvlLeaveApyDiff}
            backstopDiff={data.backstopDiff}
            backstopTvl={data.backstopTvl}
            dcSamConfig={data.dcSamConfig}
            originalAuctionResult={originalAuctionResult}
            epochsPerYear={data.epochsPerYear}
            minBondEpochs={data.dcSamConfig.minBondEpochs}
            idealBondEpochs={data.dcSamConfig.idealBondEpochs}
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
            notificationsMap={notificationsMap}
          />
        )}
      </div>
    </div>
  )
}

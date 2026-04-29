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
import type { DashboardOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

export type PendingEdits = {
  bidPmpe?: string
  inflationCommissionPct?: string
  mevCommissionPct?: string
  blockRewardsCommissionPct?: string
  bondTopUpSol?: string
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const [simulationModeActive, setSimulationModeActive] = useState(false)
  const [editingValidator, setEditingValidator] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [simulationRunId, setSimulationRunId] = useState(0)
  const [simulationOverrides, setSimulationOverrides] =
    useState<DashboardOverrides | null>(null)
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
      if (!simulationModeActive) {
        return
      }
      if (voteAccount === editingValidator) {
        setEditingValidator(null)
        setPendingEdits({})
        return
      }
      setEditingValidator(voteAccount)
      const ov = voteAccount === simulatedValidator ? simulationOverrides : null
      if (ov) {
        const next: PendingEdits = {}
        const bid = ov.cpmpesDec?.get(voteAccount)
        if (bid !== undefined) next.bidPmpe = bid.toString()
        const infl = ov.inflationCommissionsDec?.get(voteAccount)
        if (infl !== undefined)
          next.inflationCommissionPct = (infl * 100).toString()
        const mev = ov.mevCommissionsDec?.get(voteAccount)
        if (mev !== undefined) next.mevCommissionPct = (mev * 100).toString()
        const blk = ov.blockRewardsCommissionsDec?.get(voteAccount)
        if (blk !== undefined)
          next.blockRewardsCommissionPct = (blk * 100).toString()
        const bond = ov.bondTopUpSol?.get(voteAccount)
        if (bond !== undefined) next.bondTopUpSol = bond.toString()
        setPendingEdits(next)
      } else {
        setPendingEdits({})
      }
    },
    [
      simulationModeActive,
      editingValidator,
      simulatedValidator,
      simulationOverrides,
    ],
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
    const orig = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === editingValidator,
    )
    if (!orig) {
      return
    }

    const overrides: DashboardOverrides = {
      inflationCommissionsDec: new Map(),
      mevCommissionsDec: new Map(),
      blockRewardsCommissionsDec: new Map(),
      cpmpesDec: new Map(),
      bondTopUpSol: new Map(),
    }
    const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9

    if (pendingEdits.bidPmpe !== undefined) {
      const bid = parseFloat(pendingEdits.bidPmpe)
      if (!isNaN(bid) && !eq(bid, orig.revShare.bidPmpe)) {
        overrides.cpmpesDec.set(editingValidator, bid)
      }
    }
    if (pendingEdits.inflationCommissionPct !== undefined) {
      const pct = parseFloat(pendingEdits.inflationCommissionPct)
      if (!isNaN(pct) && !eq(pct / 100, orig.inflationCommissionDec ?? 0)) {
        overrides.inflationCommissionsDec.set(editingValidator, pct / 100)
      }
    }
    if (pendingEdits.mevCommissionPct !== undefined) {
      const pct = parseFloat(pendingEdits.mevCommissionPct)
      if (!isNaN(pct) && !eq(pct / 100, orig.mevCommissionDec ?? 0)) {
        overrides.mevCommissionsDec.set(editingValidator, pct / 100)
      }
    }
    if (pendingEdits.blockRewardsCommissionPct !== undefined) {
      const pct = parseFloat(pendingEdits.blockRewardsCommissionPct)
      if (!isNaN(pct) && !eq(pct / 100, orig.blockRewardsCommissionDec ?? 1)) {
        overrides.blockRewardsCommissionsDec.set(editingValidator, pct / 100)
      }
    }
    if (pendingEdits.bondTopUpSol !== undefined) {
      const delta = parseFloat(pendingEdits.bondTopUpSol)
      if (!isNaN(delta) && delta !== 0) {
        overrides.bondTopUpSol.set(editingValidator, delta)
      }
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
        <Banner {...getBannerData()} />
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' && displayAuctionResult && (
          <SamTable
            auctionResult={displayAuctionResult}
            nameByVote={data.nameByVote}
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
            simulationOverrides={simulationOverrides}
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

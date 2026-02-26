import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { UserLevel } from 'src/components/navigation/navigation'
import { SamDetail } from 'src/components/sam-detail/sam-detail'
import { SamTable } from 'src/components/sam-table/sam-table'
import { cn } from 'src/lib/utils'
import { getBannerData } from 'src/services/banner'
import { loadSam } from 'src/services/sam'
import { fetchValidators } from 'src/services/validators'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
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
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )
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

  const scrollPositionRef = useRef<number>(0)

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
      scrollPositionRef.current = window.scrollY
      setSelectedValidator(voteAccount)
      setViewMode('detail')
    },
    [simulationModeActive, editingValidator],
  )

  const handleBack = useCallback(() => {
    setViewMode('list')
    setSelectedValidator(null)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current)
    })
  }, [])

  const handleEnterSimulation = useCallback(() => {
    handleBack()
    if (!simulationModeActive) {
      setSimulationModeActive(true)
      if (!originalAuctionResult && data?.auctionResult) {
        setOriginalAuctionResult(data.auctionResult)
      }
    }
  }, [handleBack, simulationModeActive, originalAuctionResult, data])

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

    const resolve = (
      edit: string | undefined,
      fallback: number | null,
    ): number =>
      edit !== undefined
        ? parseFloat(edit)
        : fallback !== null
          ? fallback * 100
          : NaN

    const overrides: SourceDataOverrides = {
      inflationCommissions: new Map(),
      mevCommissions: new Map(),
      blockRewardsCommissions: new Map(),
      cpmpes: new Map(),
    }

    const infl = resolve(
      pendingEdits.inflationCommission,
      current.inflationCommissionDec,
    )
    if (!isNaN(infl)) {
      overrides.inflationCommissions.set(editingValidator, infl)
    }

    const mev = resolve(pendingEdits.mevCommission, current.mevCommissionDec)
    if (!isNaN(mev)) {
      overrides.mevCommissions.set(editingValidator, mev * 100)
    }

    const blk = resolve(
      pendingEdits.blockRewardsCommission,
      current.blockRewardsCommissionDec,
    )
    if (!isNaN(blk)) {
      overrides.blockRewardsCommissions.set(editingValidator, blk * 100)
    }

    const bid =
      pendingEdits.bidPmpe !== undefined
        ? parseFloat(pendingEdits.bidPmpe)
        : current.revShare.bidPmpe
    if (!isNaN(bid)) {
      overrides.cpmpes.set(editingValidator, bid * 1e9)
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

  const detailValidator =
    viewMode === 'detail' && selectedValidator && displayAuctionResult
      ? (displayAuctionResult.auctionData.validators.find(
          v => v.voteAccount === selectedValidator,
        ) ?? null)
      : null

  return (
    <div className="bg-slate-950">
      <div className="relative">
        <Navigation level={level}>
          <button
            className={cn(
              'simulatorToggle h-10 leading-[30px] px-5 py-[5px] m-[4px_0_4px_4px] border-none rounded cursor-pointer font-[inherit] text-[length:inherit] whitespace-nowrap transition-colors bg-blue-500 text-white hover:brightness-110',
              simulationModeActive && 'bg-indigo-500 text-white',
              isCalculating &&
                'bg-slate-800/50 text-slate-400 cursor-not-allowed',
            )}
            onClick={handleToggleSimulationMode}
            disabled={isCalculating}
          >
            {simulationModeActive ? 'Exit Simulation' : 'Enter Simulation'}
          </button>
        </Navigation>
        <Banner {...getBannerData()} />
        {status === 'error' && <p>Error fetching data</p>}
        {status === 'loading' && <Loader />}
        {status === 'success' &&
          displayAuctionResult &&
          viewMode === 'detail' &&
          detailValidator && (
            <SamDetail
              validator={detailValidator}
              meta={{
                name: nameMap.get(selectedValidator ?? '')?.name,
                countryIso: nameMap.get(selectedValidator ?? '')?.countryIso,
                rank:
                  displayAuctionResult.auctionData.validators.findIndex(
                    v => v.voteAccount === selectedValidator,
                  ) + 1,
              }}
              epochsPerYear={data.epochsPerYear}
              isExpert={level === UserLevel.Expert}
              onBack={handleBack}
              onEdit={handleEnterSimulation}
            />
          )}
        {status === 'success' &&
          displayAuctionResult &&
          viewMode === 'list' && (
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
              validatorMeta={nameMap}
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

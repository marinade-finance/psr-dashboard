import React, { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation, UserLevel } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import { getBannerData } from 'src/services/banner'
import { loadSam, selectBondSize } from 'src/services/sam'
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

  const nameStringMap = useMemo(
    () => new Map([...nameMap.entries()].map(([k, v]) => [k, v.name])),
    [nameMap],
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

  const handleEnterSimulation = useCallback(() => {
    setSelectedValidator(null)
    if (!simulationModeActive) {
      setSimulationModeActive(true)
      if (!originalAuctionResult && data?.auctionResult) {
        setOriginalAuctionResult(data.auctionResult)
      }
    }
  }, [simulationModeActive, originalAuctionResult, data])

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

  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator || !data) return
      const overrides: SourceDataOverrides = {
        inflationCommissionsDec: new Map(),
        mevCommissionsDec: new Map(),
        blockRewardsCommissionsDec: new Map(),
        cpmpesDec: new Map(),
      }
      if (inflationCommission !== null)
        overrides.inflationCommissionsDec.set(
          selectedValidator,
          inflationCommission,
        )
      if (mevCommission !== null)
        overrides.mevCommissionsDec.set(selectedValidator, mevCommission)
      if (blockRewardsCommission !== null)
        overrides.blockRewardsCommissionsDec.set(
          selectedValidator,
          blockRewardsCommission,
        )
      if (bidPmpe !== null) overrides.cpmpesDec.set(selectedValidator, bidPmpe)
      if (!originalAuctionResult && data?.auctionResult)
        setOriginalAuctionResult(data.auctionResult)
      setSimulationOverrides(overrides)
      setSimulatedValidator(selectedValidator)
      setIsCalculating(true)
      setSimulationRunId(prev => prev + 1)
    },
    [selectedValidator, data, originalAuctionResult],
  )

  const displayAuctionResult =
    simulationModeActive || !originalAuctionResult
      ? data?.auctionResult
      : originalAuctionResult

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
          onToggleSimulation={handleToggleSimulationMode}
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
            nameMap={nameStringMap}
            rank={sheetValidatorData.rank}
            totalValidators={sheetValidatorData.totalValidators}
            onClose={handleBack}
            onSimulate={handleDetailSimulate}
            isCalculating={isCalculating}
          />
        )}
    </div>
  )
}

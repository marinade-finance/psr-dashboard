import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'

import { Banner } from 'src/components/banner/banner'
import { Loader } from 'src/components/loader/loader'
import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import {
  fetchAllNotifications,
  fetchLatestSamAuctionBroadcastNotification,
} from 'src/services/notifications'
import {
  augmentAuctionResult,
  fetchValidatorNames,
  loadSam,
  selectBondSize,
  selectMaxAPY,
} from 'src/services/sam'
import { mergeOverrides, removeFromOverrides } from 'src/services/simulation'

import type { AuctionResult } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

// Read the validator vote-account from the URL `?v=...` query so the detail
// sheet survives a page reload and the browser back button.
const readValidatorFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('v')
}

export const SamPage: React.FC<Props> = ({ level }) => {
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    readValidatorFromUrl,
  )
  const [isCalculating, setIsCalculating] = useState(false)
  const [simulationRunId, setSimulationRunId] = useState(0)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [simulatedValidators, setSimulatedValidators] = useState<Set<string>>(
    new Set(),
  )
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  const { data, status } = useQuery(
    ['sam', simulationRunId],
    () => loadSam(simulationOverrides),
    {
      keepPreviousData: true,
      onSettled: () => {
        setIsCalculating(false)
      },
    },
  )

  const { data: validatorNames } = useQuery(
    ['validator-names'],
    fetchValidatorNames,
    { staleTime: Infinity },
  )

  const { data: notificationsMap } = useQuery(
    ['notifications-all', 'sam_auction'],
    () => fetchAllNotifications('sam_auction'),
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  )

  const { data: latestBroadcastNotification } = useQuery(
    'notifications-broadcast',
    fetchLatestSamAuctionBroadcastNotification,
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  )

  const nameMap = useMemo(() => {
    const map = new Map<string, { name?: string; countryIso?: string | null }>()
    if (!validatorNames) return map
    for (const [vote, name] of validatorNames) {
      map.set(vote, { name })
    }
    return map
  }, [validatorNames])

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

  const handleValidatorClick = useCallback((voteAccount: string) => {
    setSelectedValidator(prev => {
      const url = new URL(window.location.href)
      url.searchParams.set('v', voteAccount)
      if (prev === null) {
        // Opening — push so browser-back closes the sheet
        window.history.pushState({ v: voteAccount }, '', url)
      } else {
        // Switching between validators — replace, no extra back step
        window.history.replaceState({ v: voteAccount }, '', url)
      }
      return voteAccount
    })
  }, [])

  const handleBack = useCallback(() => {
    const state = window.history.state as { v?: string } | null
    if (state?.v) {
      window.history.back()
    } else {
      // No pushed state to pop (e.g. opened via deep link); strip the param.
      const url = new URL(window.location.href)
      url.searchParams.delete('v')
      window.history.replaceState(null, '', url)
      setSelectedValidator(null)
    }
  }, [])

  // Keep state in sync with the URL when the user uses the browser back/forward.
  useEffect(() => {
    const onPop = () => setSelectedValidator(readValidatorFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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

  const displayAuctionResult = data?.auctionResult

  const sheetValidatorData = useMemo(() => {
    if (!selectedValidator || !displayAuctionResult || !data) return null
    const augmented = augmentAuctionResult(displayAuctionResult)
    const validators = augmented
      .filter(v => selectBondSize(v) > 0)
      .sort(
        (a, b) =>
          selectMaxAPY(b, data.epochsPerYear) -
          selectMaxAPY(a, data.epochsPerYear),
      )
    const index = validators.findIndex(v => v.voteAccount === selectedValidator)
    if (index === -1) return null
    return {
      validator: validators[index],
      rank: index + 1,
      totalValidators: validators.length,
    }
  }, [selectedValidator, displayAuctionResult, data])

  return (
    <div className="bg-background-page">
      <Navigation level={level} />
      {latestBroadcastNotification && (
        <div className="px-4 pt-3 pb-0 max-w-[1920px] mx-auto">
          <Banner
            key={latestBroadcastNotification.id}
            title={latestBroadcastNotification.title ?? 'Announcement'}
            body={latestBroadcastNotification.message}
          />
        </div>
      )}
      {status === 'error' && <p>Error fetching data</p>}
      {status === 'loading' && <Loader />}
      {status === 'success' && displayAuctionResult && (
        <SamTable
          auctionResult={displayAuctionResult}
          originalAuctionResult={originalAuctionResult}
          epochsPerYear={data.epochsPerYear}
          dsSamConfig={data.dcSamConfig}
          level={level}
          simulatedValidators={simulatedValidators}
          isCalculating={isCalculating}
          validatorMeta={nameMap}
          onValidatorClick={handleValidatorClick}
          onValidatorSearch={handleValidatorClick}
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
            notificationsMap={notificationsMap}
            rank={sheetValidatorData.rank}
            isSimulated={simulatedValidators.has(selectedValidator ?? '')}
            onClose={handleBack}
            onSimulate={handleDetailSimulate}
            onClearSimulation={
              simulatedValidators.has(selectedValidator ?? '')
                ? () =>
                    selectedValidator && handleClearValidator(selectedValidator)
                : undefined
            }
            isCalculating={isCalculating}
            level={level}
          />
        )}
    </div>
  )
}

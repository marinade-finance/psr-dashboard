import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import React, { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Banner } from 'src/components/banner/banner'
import { FetchError } from 'src/components/fetch-error/fetch-error'
import { ICON_ROWS_COMPACT } from 'src/components/icons/icon-rows-compact'
import { ICON_ROWS_DETAILED } from 'src/components/icons/icon-rows-detailed'
import { Button } from 'src/components/ui/button'
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
import { runSdkRerun } from 'src/services/sdk-rerun'

import type { AuctionResult, DsSamConfig } from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { AppOverrides } from 'src/services/simulation'

type SamResult = {
  auctionResult: AuctionResult
  epochsPerYear: number
  dsSamConfig: DsSamConfig
}

// Injection points used by /test-* routes to swap in fixture data.
// Production callers pass nothing; defaults call the real services.
export type SamDataSources = {
  loadAuction: () => Promise<SamResult>
  loadValidatorNames: () => Promise<Map<string, string>>
}

type Props = {
  level?: UserLevel
  dataSources?: SamDataSources
}

const SIM_BANNER_CLASS =
  'sticky top-14 z-[49] flex items-center justify-between gap-3 px-4 py-2.5 bg-status-yellow text-background font-semibold text-sm uppercase tracking-wide'

const SIM_RESET_BTN_CLASS =
  'shrink-0 px-3 py-1 rounded bg-background text-status-yellow text-xs font-bold hover:bg-background/90 transition-colors'

export const SamPage: React.FC<Props> = ({ level, dataSources }) => {
  const loadAuction = dataSources?.loadAuction ?? loadSam
  const loadValidatorNames =
    dataSources?.loadValidatorNames ?? fetchValidatorNames
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedValidator = searchParams.get('v')
  const [isCompact, setIsCompact] = useState(true)
  const [simulationOverrides, setSimulationOverrides] =
    useState<AppOverrides | null>(null)
  const [simulatedValidators, setSimulatedValidators] = useState<Set<string>>(
    new Set(),
  )
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  const { data, status } = useQuery({
    queryKey: ['sam'],
    queryFn: () => loadAuction(),
    placeholderData: keepPreviousData,
  })

  function simulateOverrides(overrides: AppOverrides): Promise<SamResult> {
    const current = queryClient.getQueryData<SamResult>(['sam'])
    if (!current) return Promise.reject(new Error('No auction data'))
    const baseAuctionData =
      originalAuctionResult?.auctionData ?? current.auctionResult.auctionData
    const result = runSdkRerun(baseAuctionData, current.dsSamConfig, overrides)
    return Promise.resolve({
      auctionResult: result,
      epochsPerYear: current.epochsPerYear,
      dsSamConfig: current.dsSamConfig,
    })
  }

  const { mutate: runSimulation, isPending: isCalculating } = useMutation({
    mutationFn: simulateOverrides,
    onSuccess: result => {
      queryClient.setQueryData(['sam'], result)
    },
    onError: err => console.error('[sam-sim] failed:', err),
  })

  const { data: validatorNames } = useQuery({
    queryKey: ['validator-names'],
    queryFn: loadValidatorNames,
    staleTime: Infinity,
  })

  const { data: notificationsMap } = useQuery({
    queryKey: ['notifications-all', 'sam_auction'],
    queryFn: ({ signal }) => fetchAllNotifications('sam_auction', signal),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  const { data: latestBroadcastNotification } = useQuery({
    queryKey: ['notifications-broadcast'],
    queryFn: ({ signal }) => fetchLatestSamAuctionBroadcastNotification(signal),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  const nameMap = useMemo(() => {
    const map = new Map<string, { name?: string }>()
    if (!validatorNames) return map
    for (const [vote, name] of validatorNames) {
      map.set(vote, { name })
    }
    return map
  }, [validatorNames])

  const ensureOriginalSaved = useCallback(() => {
    if (!originalAuctionResult && data?.auctionResult) {
      setOriginalAuctionResult(data.auctionResult)
    }
  }, [originalAuctionResult, data])

  const handleResetSimulation = useCallback(() => {
    // Restore original data immediately so the table snaps back without
    // waiting for the background refetch to complete.
    const orig = originalAuctionResult?.auctionData ?? null
    if (orig) {
      const current = queryClient.getQueryData<SamResult>(['sam'])
      if (current) {
        queryClient.setQueryData(['sam'], {
          ...current,
          auctionResult: originalAuctionResult ?? current.auctionResult,
        })
      }
    }
    setSimulationOverrides(null)
    setSimulatedValidators(new Set())
    setOriginalAuctionResult(null)
  }, [queryClient, originalAuctionResult])

  const handleClearValidator = useCallback(
    (voteAccount: string) => {
      const nextOverrides = removeFromOverrides(
        simulationOverrides,
        voteAccount,
      )
      const nextSet = new Set(simulatedValidators)
      nextSet.delete(voteAccount)

      setSimulatedValidators(nextSet)

      if (nextSet.size === 0) {
        // All cleared — restore base auction optimistically (mirrors reset).
        const current = queryClient.getQueryData<SamResult>(['sam'])
        if (current && originalAuctionResult) {
          queryClient.setQueryData(['sam'], {
            ...current,
            auctionResult: originalAuctionResult,
          })
        }
        setSimulationOverrides(null)
        setOriginalAuctionResult(null)
      } else {
        setSimulationOverrides(nextOverrides)
        if (nextOverrides) runSimulation(nextOverrides)
      }
    },
    [
      simulationOverrides,
      simulatedValidators,
      queryClient,
      runSimulation,
      originalAuctionResult,
    ],
  )

  const handleClearSelectedValidator = useCallback(() => {
    if (selectedValidator) handleClearValidator(selectedValidator)
  }, [selectedValidator, handleClearValidator])

  const handleValidatorClick = useCallback(
    (voteAccount: string) => {
      if (selectedValidator !== null) {
        // Any click while the sheet is open dismisses it first.
        // The user clicks a second time to open the new validator.
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.delete('v')
          return next
        })
      } else {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.set('v', voteAccount)
          return next
        })
      }
    },
    [setSearchParams, selectedValidator],
  )

  const handleBack = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('v')
      return next
    })
  }, [setSearchParams])

  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
      bondBalanceSol: number | null,
    ) => {
      if (!selectedValidator || !data) return
      ensureOriginalSaved()
      const next = mergeOverrides(simulationOverrides, selectedValidator, {
        inflationCommissionDec: inflationCommission,
        mevCommissionDec: mevCommission,
        blockRewardsCommissionDec: blockRewardsCommission,
        bidPmpe,
        bondBalanceSol,
      })
      setSimulationOverrides(next)
      setSimulatedValidators(prev => new Set([...prev, selectedValidator]))
      runSimulation(next)
    },
    [
      selectedValidator,
      data,
      simulationOverrides,
      ensureOriginalSaved,
      runSimulation,
    ],
  )

  const displayAuctionResult = data?.auctionResult

  const sheetValidatorData = useMemo(() => {
    if (!selectedValidator || !displayAuctionResult || !data) return null
    const augmented = augmentAuctionResult(
      displayAuctionResult,
      data.dsSamConfig.minBondBalanceSol,
    )
    const validators = augmented
      .filter(validator => (selectBondSize(validator) ?? 0) > 0)
      .sort(
        (a, b) =>
          selectMaxAPY(b, data.epochsPerYear) -
          selectMaxAPY(a, data.epochsPerYear),
      )
    const index = validators.findIndex(
      validator => validator.voteAccount === selectedValidator,
    )
    if (index === -1) return null
    return {
      validator: validators[index],
      rank: index + 1,
      totalValidators: validators.length,
    }
  }, [selectedValidator, displayAuctionResult, data])

  return (
    <div className="bg-background-page">
      <Navigation level={level}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsCompact(c => !c)}
          className="ml-2 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={
            isCompact ? 'Switch to detailed view' : 'Switch to compact view'
          }
          title={isCompact ? 'Detailed view' : 'Compact view'}
        >
          {isCompact ? ICON_ROWS_COMPACT : ICON_ROWS_DETAILED}
        </Button>
      </Navigation>
      {simulatedValidators.size > 0 && (
        <div className={SIM_BANNER_CLASS}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-background animate-pulse shrink-0" />
            Simulation Mode — what-if numbers, not live (
            {simulatedValidators.size} validator
            {simulatedValidators.size === 1 ? '' : 's'} modified) ·
            strikethrough = original position
          </span>
          <button
            onClick={handleResetSimulation}
            className={SIM_RESET_BTN_CLASS}
          >
            Reset Simulation
          </button>
        </div>
      )}
      <div>
        {latestBroadcastNotification && (
          <div className="max-w-[1920px] mx-auto px-4 pt-3 pb-0">
            <Banner
              key={latestBroadcastNotification.id}
              title={latestBroadcastNotification.title ?? 'Announcement'}
              body={latestBroadcastNotification.message}
            />
          </div>
        )}
        {status === 'error' && (
          <FetchError
            title="Couldn't load auction data."
            detail="The SAM API didn't respond. Try reloading."
          />
        )}
        {status === 'pending' && <Loader />}
        {status === 'success' && displayAuctionResult && (
          <SamTable
            auctionResult={displayAuctionResult}
            originalAuctionResult={originalAuctionResult}
            epochsPerYear={data.epochsPerYear}
            dsSamConfig={data.dsSamConfig}
            level={level}
            isCompact={isCompact}
            simulatedValidators={simulatedValidators}
            isCalculating={isCalculating}
            validatorMeta={nameMap}
            onValidatorClick={handleValidatorClick}
            onValidatorSearch={handleValidatorClick}
            onClearValidator={handleClearValidator}
          />
        )}
      </div>
      {status === 'success' &&
        displayAuctionResult &&
        sheetValidatorData &&
        data && (
          <ValidatorDetail
            key={selectedValidator ?? 'detail'}
            validator={sheetValidatorData.validator}
            auctionResult={displayAuctionResult}
            originalAuctionResult={originalAuctionResult}
            dsSamConfig={data.dsSamConfig}
            epochsPerYear={data.epochsPerYear}
            nameMap={nameMap}
            notificationsMap={notificationsMap}
            rank={sheetValidatorData.rank}
            isSimulated={simulatedValidators.has(selectedValidator ?? '')}
            onClose={handleBack}
            onSimulate={handleDetailSimulate}
            onClearSimulation={
              simulatedValidators.has(selectedValidator ?? '')
                ? handleClearSelectedValidator
                : undefined
            }
            isCalculating={isCalculating}
            level={level}
          />
        )}
    </div>
  )
}

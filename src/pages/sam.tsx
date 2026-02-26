import React, { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'react-query'

import { PageLayout } from 'src/components/page-layout/page-layout'
import { SamTable } from 'src/components/sam-table/sam-table'
import { SamSkeleton } from 'src/components/skeleton/skeleton'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import { loadSam, selectBondSize } from 'src/services/sam'
import {
  fetchValidators,
  selectName,
  selectVoteAccount as selectValidatorVoteAccount,
} from 'src/services/validators'

import type {
  AuctionResult,
  AuctionValidator,
} from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'

type Props = {
  level: UserLevel
}

export const SamPage: React.FC<Props> = ({ level }) => {
  // Is a simulation calculation running
  const [isCalculating, setIsCalculating] = useState(false)
  // Counter to force cache invalidation
  const [simulationRunId, setSimulationRunId] = useState(0)
  // The actual overrides sent to the SDK (for the simulated validator)
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  // Which validator has been simulated
  const [simulatedValidator, setSimulatedValidator] = useState<string | null>(
    null,
  )

  // Original auction result (saved when entering simulation)
  const [originalAuctionResult, setOriginalAuctionResult] =
    useState<AuctionResult | null>(null)

  // Selected validator for detail view (null = closed)
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )

  const { data, status } = useQuery(
    ['sam', simulationRunId],
    () => loadSam(simulationOverrides),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      onSettled: () => {
        setIsCalculating(false)
      },
    },
  )

  // Fetch validator names for display
  const { data: validatorsData } = useQuery('validators', fetchValidators, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Build vote account → name lookup map
  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (validatorsData?.validators) {
      for (const v of validatorsData.validators) {
        map.set(selectValidatorVoteAccount(v), selectName(v))
      }
    }
    return map
  }, [validatorsData])

  // Handle clicking on a validator row — always open detail view
  const handleValidatorClick = useCallback((voteAccount: string) => {
    setSelectedValidator(voteAccount)
  }, [])

  // Close validator detail view
  const handleCloseDetail = useCallback(() => {
    setSelectedValidator(null)
  }, [])

  // Handle simulation from detail view
  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator || !data) return

      const overrides: SourceDataOverrides = {
        inflationCommissions: new Map(),
        mevCommissions: new Map(),
        blockRewardsCommissions: new Map(),
        cpmpes: new Map(),
      }

      if (inflationCommission !== null) {
        overrides.inflationCommissions.set(
          selectedValidator,
          inflationCommission * 100,
        )
      }
      if (mevCommission !== null) {
        overrides.mevCommissions.set(selectedValidator, mevCommission * 10000)
      }
      if (blockRewardsCommission !== null) {
        overrides.blockRewardsCommissions.set(
          selectedValidator,
          blockRewardsCommission * 10000,
        )
      }
      if (bidPmpe !== null) {
        overrides.cpmpes.set(selectedValidator, bidPmpe * 1e9)
      }

      if (!originalAuctionResult && data?.auctionResult) {
        setOriginalAuctionResult(data.auctionResult)
      }

      setSimulationOverrides(overrides)
      setSimulatedValidator(selectedValidator)
      setIsCalculating(true)
      setSimulationRunId(prev => prev + 1)
    },
    [selectedValidator, data, originalAuctionResult],
  )

  const hasSimulationApplied = simulatedValidator !== null

  // When we have simulation results, show them; otherwise show original/fetched data
  const displayAuctionResult = simulatedValidator
    ? data?.auctionResult
    : (originalAuctionResult ?? data?.auctionResult)

  // Get selected validator data and compute rank
  const selectedValidatorData = useMemo((): {
    validator: AuctionValidator
    rank: number
    totalValidators: number
  } | null => {
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
    <PageLayout
      level={level}
      title="Stake Auction Marketplace"
      subtitle="Epoch 924 · Per-validator cap: 8% of TVL (MIP-19)"
    >
      {status === 'error' && (
        <p className="text-destructive text-center text-sm py-8">
          Error fetching data
        </p>
      )}
      {status === 'loading' && <SamSkeleton />}
      {status === 'success' && displayAuctionResult && (
        <SamTable
          auctionResult={displayAuctionResult}
          originalAuctionResult={originalAuctionResult}
          epochsPerYear={data.epochsPerYear}
          dsSamConfig={data.dcSamConfig}
          level={level}
          simulatedValidator={simulatedValidator}
          isCalculating={isCalculating}
          hasSimulationApplied={hasSimulationApplied}
          onValidatorClick={handleValidatorClick}
          nameMap={nameMap}
        />
      )}

      {selectedValidatorData && data && (
        <ValidatorDetail
          validator={selectedValidatorData.validator}
          auctionResult={displayAuctionResult}
          dsSamConfig={data.dcSamConfig}
          epochsPerYear={data.epochsPerYear}
          rank={selectedValidatorData.rank}
          totalValidators={selectedValidatorData.totalValidators}
          onClose={handleCloseDetail}
          onSimulate={handleDetailSimulate}
          isCalculating={isCalculating}
        />
      )}
    </PageLayout>
  )
}

import React, { useState, useCallback, useMemo } from 'react'

import { Navigation } from 'src/components/navigation/navigation'
import { SamTable } from 'src/components/sam-table/sam-table'
import { ValidatorDetail } from 'src/components/validator-detail/validator-detail'
import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
  TEST_EPOCHS_PER_YEAR,
  TEST_VALIDATOR_NAMES,
} from 'src/fixtures/test-validators'
import { augmentAuctionResult, selectBondSize } from 'src/services/sam'
import { mergeOverrides, removeFromOverrides } from 'src/services/simulation'

import type { UserLevel } from 'src/components/navigation/navigation'
import type { SourceDataOverrides } from 'src/services/sam'

const NAME_MAP = new Map<string, { name?: string; countryIso?: string | null }>(
  [...TEST_VALIDATOR_NAMES.entries()].map(([vote, name]) => [vote, { name }]),
)

type Props = {
  level: UserLevel
}

export const TestSamPage: React.FC<Props> = ({ level }) => {
  const [selectedValidator, setSelectedValidator] = useState<string | null>(
    null,
  )
  const [simulationOverrides, setSimulationOverrides] =
    useState<SourceDataOverrides | null>(null)
  const [simulatedValidators, setSimulatedValidators] = useState<Set<string>>(
    new Set(),
  )

  // Static fixture — simulation re-runs the auction in-process (no async)
  const auctionResult = TEST_AUCTION_RESULT

  const handleResetSimulation = useCallback(() => {
    setSimulationOverrides(null)
    setSimulatedValidators(new Set())
  }, [])

  const handleClearValidator = useCallback((voteAccount: string) => {
    setSimulationOverrides(prev => {
      const next = removeFromOverrides(prev, voteAccount)
      return next
    })
    setSimulatedValidators(prev => {
      const next = new Set(prev)
      next.delete(voteAccount)
      if (next.size === 0) setSimulationOverrides(null)
      return next
    })
  }, [])

  const handleValidatorClick = useCallback((voteAccount: string) => {
    setSelectedValidator(voteAccount)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedValidator(null)
  }, [])

  const handleDetailSimulate = useCallback(
    (
      inflationCommission: number | null,
      mevCommission: number | null,
      blockRewardsCommission: number | null,
      bidPmpe: number | null,
    ) => {
      if (!selectedValidator) return
      const next = mergeOverrides(simulationOverrides, selectedValidator, {
        inflationCommissionDec: inflationCommission,
        mevCommissionDec: mevCommission,
        blockRewardsCommissionDec: blockRewardsCommission,
        bidPmpe,
      })
      setSimulationOverrides(next)
      setSimulatedValidators(prev => new Set([...prev, selectedValidator]))
    },
    [selectedValidator, simulationOverrides],
  )

  const sheetValidatorData = useMemo(() => {
    if (!selectedValidator) return null
    const augmented = augmentAuctionResult(auctionResult)
    const validators = augmented
      .filter(validator => selectBondSize(validator) > 0)
      .sort(
        (va, vb) =>
          vb.auctionStake.marinadeSamTargetSol -
          va.auctionStake.marinadeSamTargetSol,
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
  }, [selectedValidator, auctionResult])

  return (
    <div className="bg-background-page">
      <Navigation level={level} />
      <SamTable
        auctionResult={auctionResult}
        originalAuctionResult={null}
        epochsPerYear={TEST_EPOCHS_PER_YEAR}
        dsSamConfig={TEST_DS_SAM_CONFIG}
        level={level}
        simulatedValidators={simulatedValidators}
        isCalculating={false}
        validatorMeta={NAME_MAP}
        onValidatorClick={handleValidatorClick}
        onValidatorSearch={handleValidatorClick}
        onClearValidator={handleClearValidator}
        onResetSimulation={handleResetSimulation}
      />
      {sheetValidatorData && (
        <ValidatorDetail
          validator={sheetValidatorData.validator}
          auctionResult={auctionResult}
          dsSamConfig={TEST_DS_SAM_CONFIG}
          epochsPerYear={TEST_EPOCHS_PER_YEAR}
          nameMap={NAME_MAP}
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
          isCalculating={false}
          level={level}
        />
      )}
    </div>
  )
}

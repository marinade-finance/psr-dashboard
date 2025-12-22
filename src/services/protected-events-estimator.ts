import { lamportsToSol } from 'src/format'

import { fetchRewards } from './rewards'

import type { ProtectedEvent, SettlementMeta } from './protected-events'
import type { EpochRewards } from './rewards'
import type { Validator, ValidatorEpoch } from './validators'

type LowCreditsSettlementConfig = {
  meta: SettlementMeta
  min_settlement_lamports: number
  grace_low_credits_bps: number
  covered_range_bps: [number, number]
}

type CommissionIncreaseSettlementConfig = {
  meta: SettlementMeta
  min_settlement_lamports: number
  grace_commission_increase: number
  covered_range_bps: [number, number]
}

const lowCreditsSettlementConfigs: LowCreditsSettlementConfig[] = [
  {
    meta: { funder: 'ValidatorBond' },
    min_settlement_lamports: 100000000,
    grace_low_credits_bps: 100,
    covered_range_bps: [0, 2000],
  },
  {
    meta: { funder: 'Marinade' },
    min_settlement_lamports: 100000000,
    grace_low_credits_bps: 100,
    covered_range_bps: [2000, 10000],
  },
]

const commissionIncreaseSettlementConfigs: CommissionIncreaseSettlementConfig[] =
  [
    {
      meta: { funder: 'ValidatorBond' },
      min_settlement_lamports: 100000000,
      grace_commission_increase: 1,
      covered_range_bps: [0, 10000],
    },
  ]

type EprCalculator = (commission: number) => number

const bpsToFraction = (bps: number) => bps / 1e4

const claimAmountInLossRange = (
  coveredRangeBps: [number, number],
  actualEpr: number,
  expectedEpr: number,
  stake: number,
): number => {
  const [lowerBps, upperBps] = coveredRangeBps

  const maxClaimPerStake = bpsToFraction(upperBps) * expectedEpr
  const ignoredClaimPerStake = bpsToFraction(lowerBps) * expectedEpr
  const claimPerStake =
    Math.min(expectedEpr - actualEpr, maxClaimPerStake) - ignoredClaimPerStake

  return Math.round(Math.max(stake * claimPerStake, 0))
}

const calcStakeByEpoch = (validators: Validator[]) => {
  const result: Map<number, number> = new Map()

  for (const validator of validators) {
    for (const epochStat of validator.epoch_stats) {
      const stake = result.get(epochStat.epoch) ?? 0
      result.set(
        epochStat.epoch,
        stake + Number(lamportsToSol(epochStat.activated_stake)),
      )
    }
  }

  return result
}

const calcTargetCreditsByEpoch = (validators: Validator[]) => {
  const sumOfWeightedCreditsPerEpoch: Map<number, number> = new Map()
  const sumOfWeightsPerEpoch: Map<number, number> = new Map()

  for (const validator of validators) {
    for (const epochStat of validator.epoch_stats) {
      const prevSumOfWeightedCredits =
        sumOfWeightedCreditsPerEpoch.get(epochStat.epoch) ?? 0
      sumOfWeightedCreditsPerEpoch.set(
        epochStat.epoch,
        prevSumOfWeightedCredits +
          epochStat.credits * Number(lamportsToSol(epochStat.activated_stake)),
      )

      const prevSumOfWeightsPerEpoch =
        sumOfWeightsPerEpoch.get(epochStat.epoch) ?? 0
      sumOfWeightsPerEpoch.set(
        epochStat.epoch,
        prevSumOfWeightsPerEpoch +
          Number(lamportsToSol(epochStat.activated_stake)),
      )
    }
  }

  const result: Map<number, number> = new Map()
  sumOfWeightsPerEpoch.forEach((sumOfWeights, epoch) => {
    result.set(
      epoch,
      Math.round((sumOfWeightedCreditsPerEpoch.get(epoch) ?? 0) / sumOfWeights),
    )
  })

  return result
}

const buildLowCreditsProtectedEvent = (
  config: LowCreditsSettlementConfig,
  eprCalculator: EprCalculator,
  targetCredits: number,
  validator: Validator,
  epochStat: ValidatorEpoch,
): ProtectedEvent | null => {
  if (epochStat.credits > targetCredits) {
    return null
  }

  const expectedEpr = eprCalculator(epochStat.commission_advertised)
  const actualEpr =
    eprCalculator(epochStat.commission_advertised) *
    (epochStat.credits / targetCredits)

  const marinadeStake =
    Number(epochStat.marinade_native_stake) + Number(epochStat.marinade_stake)
  if (marinadeStake === 0) {
    return null
  }

  const expectedRewards = marinadeStake * expectedEpr
  const actualRewards = marinadeStake * actualEpr

  const eprLossBps = Math.round(10000 * (1 - actualRewards / expectedRewards))
  if (eprLossBps <= config.grace_low_credits_bps) {
    return null
  }

  const amount = claimAmountInLossRange(
    config.covered_range_bps,
    actualEpr,
    expectedEpr,
    marinadeStake,
  )
  if (amount < config.min_settlement_lamports) {
    return null
  }

  return {
    epoch: epochStat.epoch,
    amount,
    vote_account: validator.vote_account,
    meta: config.meta,
    reason: {
      ProtectedEvent: {
        LowCredits: {
          vote_account: validator.vote_account,
          expected_credits: targetCredits,
          actual_credits: epochStat.credits,
          commission: epochStat.commission_advertised,
          expected_epr: expectedEpr,
          actual_epr: actualEpr,
          epr_loss_bps: eprLossBps,
          stake: Number(epochStat.activated_stake),
        },
      },
    },
  }
}

const buildCommissionIncreaseProtectedEvent = (
  config: CommissionIncreaseSettlementConfig,
  eprCalculator: EprCalculator,
  validator: Validator,
  prevEpochStat: ValidatorEpoch,
  epochStat: ValidatorEpoch,
): ProtectedEvent | null => {
  if (
    epochStat.commission_advertised - prevEpochStat.commission_advertised <=
    config.grace_commission_increase
  ) {
    return null
  }

  const expectedEpr = eprCalculator(prevEpochStat.commission_advertised)
  const actualEpr = eprCalculator(epochStat.commission_advertised)

  const marinadeStake =
    Number(epochStat.marinade_native_stake) + Number(epochStat.marinade_stake)
  if (marinadeStake === 0) {
    return null
  }

  const expectedRewards = marinadeStake * expectedEpr
  const actualRewards = marinadeStake * actualEpr

  const eprLossBps = Math.round(10000 * (1 - actualRewards / expectedRewards))
  if (eprLossBps < config.grace_commission_increase) {
    return null
  }

  const amount = claimAmountInLossRange(
    config.covered_range_bps,
    actualEpr,
    expectedEpr,
    marinadeStake,
  )
  if (amount < config.min_settlement_lamports) {
    return null
  }

  return {
    epoch: epochStat.epoch,
    amount,
    vote_account: validator.vote_account,
    meta: config.meta,
    reason: {
      ProtectedEvent: {
        CommissionIncrease: {
          vote_account: validator.vote_account,
          previous_commission: prevEpochStat.commission_advertised,
          current_commission: epochStat.commission_advertised,
          expected_epr: expectedEpr,
          actual_epr: actualEpr,
          epr_loss_bps: eprLossBps,
          stake: Number(epochStat.activated_stake),
        },
      },
    },
  }
}

const calculateLowCreditsEstimates = (
  validators: Validator[],
  eprCalculators: Map<number, EprCalculator>,
): ProtectedEvent[] => {
  const events = []
  const targetCreditsByEpoch = calcTargetCreditsByEpoch(validators)

  for (const validator of validators) {
    for (const epochStat of validator.epoch_stats) {
      const targetCredits = targetCreditsByEpoch.get(epochStat.epoch)
      const eprCalculator = eprCalculators.get(epochStat.epoch)
      if (eprCalculator) {
        for (const config of lowCreditsSettlementConfigs) {
          const event = buildLowCreditsProtectedEvent(
            config,
            eprCalculator,
            targetCredits,
            validator,
            epochStat,
          )
          if (event) {
            events.push(event)
          }
        }
        events.push()
      }
    }
  }

  return events
}

const calculateCommissionIncreaseEstimates = (
  validators: Validator[],
  eprCalculators: Map<number, EprCalculator>,
): ProtectedEvent[] => {
  const events = []

  for (const validator of validators) {
    for (const epochStat of validator.epoch_stats) {
      const previousEpochStats = validator.epoch_stats.find(
        someEpochStat => epochStat.epoch === someEpochStat.epoch + 1,
      )
      const eprCalculator = eprCalculators.get(epochStat.epoch)
      if (previousEpochStats && eprCalculator) {
        for (const config of commissionIncreaseSettlementConfigs) {
          const event = buildCommissionIncreaseProtectedEvent(
            config,
            eprCalculator,
            validator,
            previousEpochStats,
            epochStat,
          )
          if (event) {
            events.push(event)
          }
        }
        events.push()
      }
    }
  }

  return events
}

const buildEprCalculators = (
  stakeByEpoch: Map<number, number>,
  rewards: EpochRewards[],
) => {
  const result: Map<number, EprCalculator> = new Map()
  const currentEpochRewardsEstimate = rewards.reduce(
    ([accEpoch, accRewards], [epoch, rewards]) =>
      accEpoch < epoch ? [epoch + 1, rewards] : [accEpoch, accRewards],
    [0, 0],
  )
  for (const [epoch, epochRewards] of [
    ...rewards,
    currentEpochRewardsEstimate,
  ]) {
    const epochStake = stakeByEpoch.get(epoch) ?? 0
    if (epochStake > 0) {
      result.set(
        epoch,
        (commission: number) =>
          ((epochRewards / epochStake) * (100 - commission)) / 100,
      )
    }
  }
  return result
}

export const calculateProtectedEventEstimates = async (
  validators: Validator[],
): Promise<ProtectedEvent[]> => {
  const { rewards_inflation_est: rewardsInflationEst } = await fetchRewards()
  const stakeByEpoch = calcStakeByEpoch(validators)
  const eprCalculators = buildEprCalculators(stakeByEpoch, rewardsInflationEst)

  return [
    ...calculateLowCreditsEstimates(validators, eprCalculators),
    ...calculateCommissionIncreaseEstimates(validators, eprCalculators),
  ]
}

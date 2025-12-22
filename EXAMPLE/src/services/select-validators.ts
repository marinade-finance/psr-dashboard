import { alignEpochRange } from 'src/utils'

import { getValidatorRewards, getValidatorStake } from './bond-data-validators'
import { ValidatorPayout } from './select-validator-payouts'

import type { ValidatorRewards, ValidatorStake } from './bond-data-validators'
import type { ValidatorPayoutDto } from './select-validator-payouts'

export class SelectDataValidator {
  readonly epoch: number
  readonly voteAccount: string
  readonly name: string
  readonly isInSelectSet: boolean
  readonly stake: ValidatorStake
  readonly rewards: ValidatorRewards
  readonly payouts: ValidatorPayout[]
  readonly chargedSumSol: number
  readonly psrFeeSumSol: number
  readonly toStakersSumSol: number
  readonly toDaoSumSol: number
  readonly validatorPnlSol: number

  private constructor({
    epoch,
    voteAccount,
    name,
    isInSelectSet,
    stake,
    rewards,
    payout: payout,
  }: {
    epoch: number
    voteAccount: string
    name: string
    isInSelectSet: boolean
    stake: ValidatorStake
    rewards: ValidatorRewards
    payout: ValidatorPayout[]
  }) {
    this.epoch = epoch
    this.voteAccount = voteAccount
    this.name = name
    this.isInSelectSet = isInSelectSet
    this.stake = stake
    this.rewards = rewards
    this.payouts = payout
    this.chargedSumSol = payout.reduce(
      (sum, p) => sum + selectChargedAmount(p),
      0,
    )
    this.psrFeeSumSol = payout.reduce(
      (sum, p) => sum + selectPsrFeeAmount(p),
      0,
    )
    this.toStakersSumSol = payout.reduce(
      (sum, p) => sum + selectToStakersAmount(p),
      0,
    )
    this.toDaoSumSol = payout.reduce((sum, p) => sum + selectToDaoAmount(p), 0)
    this.validatorPnlSol =
      validatorSelectRewardsAmount(
        this.rewards.validatorRewardsSol,
        this.rewards.institutionalRatio,
      ) - this.chargedSumSol
  }

  static NO_NAME = '---'

  static fromDtoData(
    dto: ValidatorDto,
    payout: ValidatorPayoutDto[],
  ): SelectDataValidator | null {
    if (payout.some(p => p.epoch !== dto.epoch)) {
      console.error(
        `Mismatched epoch between validator and payout: ${dto.vote_account} epoch ${dto.epoch} vs ${payout.map(p => p.epoch).join(', ')}`,
      )
      return null
    }
    const isInSelectSet = dto.is_institutional
    const name = dto.name ? dto.name : SelectDataValidator.NO_NAME

    const mappedPayout = payout.map(ValidatorPayout.fromDto)
    const validator = {
      ...dto,
      voteAccount: dto.vote_account,
      name,
      isInSelectSet,
      stake: getValidatorStake(dto),
      rewards: getValidatorRewards(dto),
      payout: mappedPayout,
    }
    return new SelectDataValidator(validator)
  }
}

export type ValidatorDto = {
  readonly id: number
  readonly epoch: number
  readonly vote_account: string
  readonly name: string
  readonly total_active_lamports: string
  readonly total_activating_lamports: string
  readonly total_deactivating_lamports: string
  readonly institutional_active_lamports: string
  readonly institutional_activating_lamports: string
  readonly institutional_deactivating_lamports: string
  readonly validator_rewards_lamports: string
  readonly stakers_rewards_lamports: string
  readonly total_rewards_lamports: string
  readonly apy: string
  readonly institutional_staked_ratio: string
  readonly apy_percentile_diff: string
  readonly created_at: Date
  readonly updated_at: Date
  readonly is_institutional: boolean
}

export const fetchSelectValidators = async (
  fromEpoch?: number,
  toEpoch?: number,
): Promise<ValidatorDto[]> => {
  const baseUrl = 'https://institutional-staking.marinade.finance/v1/validators'

  if (fromEpoch === undefined && toEpoch === undefined) {
    const response = await fetch(`${baseUrl}/latest`)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch latest validators: ${response.status} ${response.statusText}`,
      )
    }
    return (await response.json()) as ValidatorDto[]
  }

  const { from, to } = alignEpochRange(fromEpoch, toEpoch)
  const params = new URLSearchParams()
  params.append('from_epoch', from.toString())
  params.append('to_epoch', to.toString())
  const response = await fetch(`${baseUrl}/epoch?${params}`)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch validators epochs [${from},${to}]: ${response.status} ${response.statusText}`,
    )
  }
  return (await response.json()) as ValidatorDto[]
}

export const selectChargedAmount = (payout: ValidatorPayout) =>
  payout.distributeToStakersSol + payout.distributorFeeSol
export const selectToStakersAmount = (payout: ValidatorPayout) =>
  payout.distributeToStakersSol
export const selectPsrFeeAmount = (payout: ValidatorPayout) => payout.psrFeeSol
export const selectValidatorRewardsAmount = (payout: ValidatorPayout) =>
  payout.validatorFeeSol
export const selectToDaoAmount = (payout: ValidatorPayout) =>
  payout.distributorFeeSol
export const validatorSelectRewardsAmount = (
  validatorRewardsLamports: number,
  institutionalStakedRatio: number,
) => Number(validatorRewardsLamports) * Number(institutionalStakedRatio)

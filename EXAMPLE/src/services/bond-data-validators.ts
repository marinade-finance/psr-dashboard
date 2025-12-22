import { lamportsToSol } from 'src/utils'

import { bondState } from './bonds'

import type { BondDto, BondState } from './bonds'
import type { ValidatorPayout } from './select-validator-payouts'
import type { ValidatorDto } from './select-validators'
import type { ApiValidator, MevRecord } from './validators-api'

export type ValidatorStake = {
  readonly totalActiveSol: number
  readonly totalActivatingSol: number
  readonly totalDeactivatingSol: number
  readonly institutionalActiveSol: number
  readonly institutionalActivatingSol: number
  readonly institutionalDeactivatingSol: number
}

export type ValidatorStakeWithApi = ValidatorStake & {
  readonly apiValidatorInstitutionalSol: number
}

export type ValidatorRewards = {
  readonly validatorRewardsSol: number
  readonly stakersRewardsSol: number
  readonly totalRewardsSol: number
  readonly institutionalRatio: number
  readonly apy: number
}

export type Commissions = {
  inflation: number
  mev: number
}

export type Bond = {
  effectiveAmountSol: number
  bondState: BondState
  updatedAt: Date
}

export class BondDataValidator {
  readonly epoch: number
  readonly voteAccount: string
  readonly name: string
  readonly isInSelectSet: boolean
  readonly commissions: Commissions
  readonly bond?: Bond | null
  readonly stake: ValidatorStakeWithApi
  readonly rewards: ValidatorRewards
  readonly payouts: ValidatorPayout[]

  private constructor({
    epoch,
    voteAccount,
    name,
    isInSelectSet,
    commissions,
    bond,
    stake,
    rewards,
    payouts,
  }: {
    epoch: number
    voteAccount: string
    name: string
    isInSelectSet: boolean
    commissions: Commissions
    bond: Bond | undefined
    stake: ValidatorStakeWithApi
    rewards: ValidatorRewards
    payouts: ValidatorPayout[]
  }) {
    this.epoch = epoch
    this.voteAccount = voteAccount
    this.name = name
    this.isInSelectSet = isInSelectSet
    this.commissions = commissions
    this.bond = bond
    this.stake = stake
    this.rewards = rewards
    this.payouts = payouts
  }

  static NO_NAME = '---'

  static fromDtoData(
    dto: ValidatorDto,
    bond: BondDto | null,
    apiValidator: ApiValidator,
    mevData: MevRecord | null,
    payouts: ValidatorPayout[],
  ): BondDataValidator | null {
    const isInSelectSet = dto.is_institutional
    const name =
      isInSelectSet && dto.name
        ? dto.name
        : (apiValidator.info_name ?? BondDataValidator.NO_NAME)
    if (isInSelectSet && !bond) {
      console.error(
        `Validator ${dto.vote_account} / ${name} is in Select. A Select validator has to have a bond defined.`,
      )
      return null
    }

    const validator = {
      ...dto,
      voteAccount: dto.vote_account,
      name,
      isInSelectSet,
      commissions: {
        inflation: apiValidator.commission_advertised / 100,
        mev: mevData ? mevData.mev_commission_bps / 10_000 : 1,
      },
      bond: bond
        ? {
            effectiveAmountSol: Number(
              lamportsToSol(bond.effective_amount.toString()),
            ),
            updatedAt: new Date(bond.updated_at),
            bondState: bondState(
              bond.effective_amount,
              Number(dto.institutional_active_lamports) +
                Number(dto.institutional_activating_lamports),
            ),
          }
        : undefined,
      stake: {
        ...getValidatorStake(dto),
        apiValidatorInstitutionalSol: Number(
          lamportsToSol(apiValidator.institutional_stake),
        ),
      },
      rewards: getValidatorRewards(dto),
      payouts,
    }
    return new BondDataValidator(validator)
  }

  hasBondAndSelect(): this is BondDataValidator & {
    bond: Bond
    isInSelectSet: true
  } {
    return this.isInSelectSet && this.bond !== null && this.bond !== undefined
  }
}

export const getValidatorStake = (validator: ValidatorDto): ValidatorStake => ({
  totalActiveSol: Number(lamportsToSol(validator.total_active_lamports)),
  totalActivatingSol: Number(
    lamportsToSol(validator.total_activating_lamports),
  ),
  totalDeactivatingSol: Number(
    lamportsToSol(validator.total_deactivating_lamports),
  ),
  institutionalActiveSol: Number(
    lamportsToSol(validator.institutional_active_lamports),
  ),
  institutionalActivatingSol: Number(
    lamportsToSol(validator.institutional_activating_lamports),
  ),
  institutionalDeactivatingSol: Number(
    lamportsToSol(validator.institutional_deactivating_lamports),
  ),
})

export const getValidatorRewards = (
  validator: ValidatorDto,
): ValidatorRewards => ({
  validatorRewardsSol: Number(
    lamportsToSol(validator.validator_rewards_lamports),
  ),
  stakersRewardsSol: Number(lamportsToSol(validator.stakers_rewards_lamports)),
  totalRewardsSol: Number(lamportsToSol(validator.total_rewards_lamports)),
  institutionalRatio: Number(validator.institutional_staked_ratio),
  apy: Number(validator.apy),
})

export const calcTotalTvl = (validators: BondDataValidator[]) =>
  validators.reduce(
    (total, validator) => total + selectTotalEffectiveStake(validator),
    0,
  )

export const calcTotalSelectTvl = (validators: BondDataValidator[]) =>
  validators.reduce(
    (total, validator) => total + selectSelectEffectiveStake(validator),
    0,
  )

export const calcApiInstitutionalTvl = (
  validators: BondDataValidator[],
): number =>
  validators.reduce(
    (total, validator) => total + selectApiInstitutionalStake(validator),
    0,
  )

export const calcTotalRewards = (validators: BondDataValidator[]) =>
  validators.reduce(
    (total, validator) => total + selectTotalRewards(validator),
    0,
  )

export const selectEpoch = (validator: BondDataValidator) => validator.epoch
export const selectVoteAccount = (validator: BondDataValidator) =>
  validator.voteAccount
export const selectName = (validator: BondDataValidator) => validator.name
export const selectSelectEffectiveStake = (validator: BondDataValidator) =>
  validator.stake.institutionalActiveSol
export const selectApiInstitutionalStake = (validator: BondDataValidator) =>
  validator.stake.apiValidatorInstitutionalSol
export const selectTotalEffectiveStake = (validator: BondDataValidator) =>
  validator.stake.totalActiveSol
export const selectApy = (validator: BondDataValidator) => validator.rewards.apy
export const selectTotalRewards = (validator: BondDataValidator) =>
  validator.rewards.totalRewardsSol
export const selectInflationCommission = (validator: BondDataValidator) =>
  validator.commissions.inflation
export const selectMevCommission = (validator: BondDataValidator) =>
  validator.commissions.mev

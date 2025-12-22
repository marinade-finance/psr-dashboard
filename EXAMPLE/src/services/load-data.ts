import { BondDataValidator } from './bond-data-validators'
import { fetchBonds } from './bonds'
import {
  fetchValidatorPayouts as fetchSelectValidatorPayouts,
  ValidatorPayout,
} from './select-validator-payouts'
import { fetchSelectValidators, SelectDataValidator } from './select-validators'
import {
  fetchApiApy,
  fetchApiValidators,
  fetchJitoMevData,
} from './validators-api'

import type { BondDto, BondsResponse } from './bonds'
import type { ValidatorPayoutDto } from './select-validator-payouts'
import type { ValidatorDto } from './select-validators'
import type {
  ApiApy,
  ApiValidator,
  MevResponse,
  MevRecord,
  ApiValidatorsResponse,
} from './validators-api'

export type BondsTableData = {
  readonly validators: BondDataValidator[]
  readonly apiApy: ApiApy
}

export type SelectTableData = {
  readonly validators: SelectDataValidator[]
  readonly allPayouts: ValidatorPayout[]
}

export const loadLatestBondData = async (): Promise<{
  apiValidators: ApiValidatorsResponse
  bonds: BondsResponse
  mevData: MevResponse
  apiApy: ApiApy
}> => {
  console.log('Loading latests Bonds data')
  const [apiValidators, bonds, mevData, apiApy] = await Promise.all([
    fetchApiValidators(),
    fetchBonds(),
    fetchJitoMevData(),
    fetchApiApy(),
  ])
  return { apiValidators, bonds, mevData, apiApy }
}

export const loadSelectEpochData = async (
  fromEpoch?: number,
  toEpoch?: number,
): Promise<{
  validators: ValidatorDto[]
  validatorPayouts: ValidatorPayoutDto[]
}> => {
  console.log(
    `Loading select epoch data for ${fromEpoch ?? 'latest'} - ${toEpoch ?? 'latest'}`,
  )
  const [validators, validatorPayouts] = await Promise.all([
    fetchSelectValidators(fromEpoch, toEpoch),
    fetchSelectValidatorPayouts(fromEpoch, toEpoch),
  ])
  return { validators, validatorPayouts }
}

const checkEpoch = (expected: number, data: { epoch: number }[]) => {
  const mismatch = data.find(({ epoch }) => epoch !== expected)
  if (mismatch !== undefined) {
    throw new Error(
      `Unexpected epoch found in data, expected ${String(expected)}: ${JSON.stringify(mismatch)}`,
    )
  }
}

export const checkAndBuildBondsData = (
  validatorDtos: ValidatorDto[],
  validatorPayoutDtos: ValidatorPayoutDto[],
  apiApy: ApiApy,
  apiValidators: ApiValidator[],
  bonds: BondDto[],
  mevData: MevRecord[],
): BondsTableData => {
  const validatorPayouts = validatorPayoutDtos.map(ValidatorPayout.fromDto)
  if (validatorDtos.length === 0) {
    return { validators: [], apiApy }
  }
  const epoch = validatorDtos[0].epoch
  checkEpoch(epoch, validatorDtos)
  // - not checking mev data as it takes MEV from validators of the latest 10 epochs backwards
  //   not returned validators are set at the declared epoch
  // - not checking bonds as those are updated every hour and does not match with the epoch
  //   that the payout were calculated (i.e., at the end of the last epoch)

  const validators = validatorDtos
    .map(validator => {
      const bond =
        bonds.find(b => b.vote_account === validator.vote_account) ?? null
      const apiValidator = apiValidators.find(
        v => v.vote_account === validator.vote_account,
      )
      const mev =
        mevData.find(m => m.vote_account === validator.vote_account) ?? null

      if (!apiValidator) {
        if (BigInt(validator.total_active_lamports) !== BigInt(0)) {
          console.warn(
            `Failed to find validator info for vote account ${validator.vote_account}, ` +
              `total active/effective: ${validator.total_active_lamports}`,
          )
        }
        // validators API filters out not-active validators, so this is expected
        return null
      }

      const payouts = validatorPayouts.filter(
        ({ voteAccount }) => voteAccount === validator.vote_account,
      )
      return BondDataValidator.fromDtoData(
        validator,
        bond,
        apiValidator,
        mev,
        payouts,
      )
    })
    .filter(v => !!v)

  return { validators, apiApy }
}

export const checkAndBuildSelectData = (
  validatorDtos: ValidatorDto[],
  validatorPayoutDtos: ValidatorPayoutDto[],
): SelectTableData => {
  const allPayouts = validatorPayoutDtos.map(ValidatorPayout.fromDto)
  if (validatorDtos.length === 0) {
    return { validators: [], allPayouts }
  }

  // verify if there is some validator that has got multiple ValidatorDto entries for the same epoch
  const seen = new Set<string>()
  for (const v of validatorDtos) {
    const key = `${v.vote_account}-${v.epoch}`
    if (seen.has(key)) {
      console.error(
        `Duplicate validator dto entry found for vote account ${v.vote_account} at epoch ${v.epoch}`,
      )
    }
    seen.add(key)
  }

  const validators = validatorDtos
    .map(validator => {
      const epochValidatorPayouts = validatorPayoutDtos.filter(
        p =>
          p.vote_account === validator.vote_account &&
          p.epoch === validator.epoch,
      )

      return SelectDataValidator.fromDtoData(validator, epochValidatorPayouts)
    })
    .filter(v => !!v)

  return { validators, allPayouts }
}

export const calcApiApy = (apiApy: ApiApy): number => {
  return apiApy.values.at(-1) ?? 0
}

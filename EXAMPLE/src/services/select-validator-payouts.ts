import { alignEpochRange, lamportsToSol } from 'src/utils'

export enum ValidatorPayoutType {
  InstitutionalPSR = 'institutional-psr',
  Institutional = 'institutional',
  NonInstitutional = 'non-institutional',
  NonInstitutionalPSR = 'non-institutional-psr',
  StakeDeactivation = 'stake-deactivation',
  StakeDeactivationPSR = 'stake-deactivation-psr',
}

export class ValidatorPayout {
  readonly epoch: number
  readonly voteAccount: string
  readonly payoutType: ValidatorPayoutType
  readonly distributorFeeSol: number
  readonly validatorFeeSol: number
  readonly distributeToStakersSol: number
  readonly psrFeeSol: number

  constructor(data: {
    epoch: number
    voteAccount: string
    payoutType: ValidatorPayoutType
    distributorFeeSol: number
    validatorFeeSol: number
    distributeToStakersSol: number
    psrFeeSol: number
  }) {
    this.epoch = data.epoch
    this.voteAccount = data.voteAccount
    this.payoutType = data.payoutType
    this.distributorFeeSol = data.distributorFeeSol
    this.validatorFeeSol = data.validatorFeeSol
    this.distributeToStakersSol = data.distributeToStakersSol
    this.psrFeeSol = data.psrFeeSol
  }

  static fromDto(this: void, dto: ValidatorPayoutDto): ValidatorPayout {
    return new ValidatorPayout({
      epoch: dto.epoch,
      voteAccount: dto.vote_account,
      payoutType: dto.payout_type,
      distributorFeeSol: Number(lamportsToSol(dto.distributor_fee_lamports)),
      validatorFeeSol: Number(lamportsToSol(dto.validator_fee_lamports)),
      distributeToStakersSol: Number(
        lamportsToSol(dto.distribute_to_stakers_lamports),
      ),
      psrFeeSol: Number(lamportsToSol(dto.psr_fee_lamports)),
    })
  }
}

export type ValidatorPayoutDto = {
  readonly id: number
  readonly epoch: number
  readonly vote_account: string
  readonly payout_type: ValidatorPayoutType
  readonly distributor_fee_lamports: string
  readonly validator_fee_lamports: string
  readonly distribute_to_stakers_lamports: string
  readonly psr_fee_lamports: string
  readonly created_at: Date
  readonly updated_at: Date
}

export const fetchValidatorPayouts = async (
  fromEpoch?: number,
  toEpoch?: number,
): Promise<ValidatorPayoutDto[]> => {
  const baseUrl =
    'https://institutional-staking.marinade.finance/v1/validator-payouts'

  if (fromEpoch === undefined && toEpoch === undefined) {
    const response = await fetch(`${baseUrl}/latest`)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch latest validator payouts: ${response.status} ${response.statusText}`,
      )
    }
    return (await response.json()) as ValidatorPayoutDto[]
  }

  const { from, to } = alignEpochRange(fromEpoch, toEpoch)
  const params = new URLSearchParams()
  params.append('from_epoch', from.toString())
  params.append('to_epoch', to.toString())
  const response = await fetch(`${baseUrl}/epoch?${params}`)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch validator payouts epochs [${from},${to}]: ${response.status} ${response.statusText}`,
    )
  }
  return (await response.json()) as ValidatorPayoutDto[]
}

export const calcTotalFees = (validatorPayouts: ValidatorPayout[]) => {
  return validatorPayouts.reduce(
    (totals, payout) => ({
      distributorFees: totals.distributorFees + payout.distributorFeeSol,
      validatorFees: totals.validatorFees + payout.validatorFeeSol,
    }),
    { distributorFees: 0, validatorFees: 0 },
  )
}

export const selectChargedAmount = (payout: ValidatorPayout | null) =>
  (payout?.distributeToStakersSol ?? 0) + (payout?.distributorFeeSol ?? 0)

export const selectTotalChargedAmount = (payouts: ValidatorPayout[]) =>
  payouts.reduce((total, payout) => total + selectChargedAmount(payout), 0)

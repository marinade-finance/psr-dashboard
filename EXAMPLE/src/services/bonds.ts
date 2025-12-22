import { StateStatus } from 'src/components/table/table'
import {
  formatSolAmount,
  LAMPORTS_PER_SOL,
  lamportsNumberToSol,
} from 'src/utils'

// Validators are required to keep their bonds balance
// high enough to cover 1 SOL per each 2000 SOL staked (https://github.com/marinade-finance/institutional-staking/pull/75)
export const ALLOWED_STAKE_PER_BOND_RATIO = 2000
const MIN_BOND_BALANCE_LAMPORTS_RED_FLAG = 10 * LAMPORTS_PER_SOL

export type BondDto = {
  pubkey: string
  vote_account: string
  authority: string
  cpmpe: number
  updated_at: string
  epoch: number
  funded_amount: number
  effective_amount: number
  remaining_witdraw_request_amount: number
  remainining_settlement_claim_amount: number
}

export type BondsResponse = {
  bonds: BondDto[]
}

export const fetchBonds = async (): Promise<BondsResponse> => {
  const res = await fetch(
    'https://validator-bonds-api.marinade.finance/bonds/institutional',
  )
  return (await res.json()) as BondsResponse
}

export const bondTooltip = (state: BondState) => {
  switch (state.status) {
    case StateStatus.DANGER:
      return (
        `Bond balance insufficient for Select program, missing ${formatSolAmount(Number(state.missingBondBalanceSol), 4)} SOL. ` +
        'Please top up your bond to maintain eligibility.'
      )
    case StateStatus.WARNING:
      return (
        `Bond balance is running low, missing ${formatSolAmount(Number(state.missingBondBalanceSol), 4)} SOL. ` +
        'Consider topping up soon to avoid losing eligibility.'
      )
    case StateStatus.OK:
      return ''
    default:
      return ''
  }
}

export type BondState =
  | {
      status: StateStatus.OK
    }
  | {
      status: StateStatus.WARNING
      missingBondBalanceSol: string
      excessStakeSol: string
    }
  | {
      status: StateStatus.DANGER
      missingBondBalanceSol: string
      excessStakeSol: string
    }

export const bondState = (
  effectiveAmount: number,
  activeAndActivatingInstitutionalStake: number,
): BondState => {
  const allowedStake = effectiveAmount * ALLOWED_STAKE_PER_BOND_RATIO
  const excessStake = Number(
    activeAndActivatingInstitutionalStake - allowedStake,
  )
  if (excessStake <= 0) {
    return { status: StateStatus.OK }
  } else {
    const missingBondBalanceSol = lamportsNumberToSol(
      excessStake / ALLOWED_STAKE_PER_BOND_RATIO,
    )
    const excessStakeSol = lamportsNumberToSol(excessStake)
    if (effectiveAmount <= MIN_BOND_BALANCE_LAMPORTS_RED_FLAG) {
      return {
        status: StateStatus.DANGER,
        missingBondBalanceSol,
        excessStakeSol,
      }
    } else {
      return {
        status: StateStatus.WARNING,
        missingBondBalanceSol,
        excessStakeSol,
      }
    }
  }
}

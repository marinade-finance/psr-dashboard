import { lamportsToSol } from "src/format";

export type ValidatorEpoch = {
    credits: number
    marinade_stake: string,
    marinade_native_stake: string,
    activated_stake: string
    commission_advertised: number
    epoch: number
}

export type Validator = {
    vote_account: string,
    info_name: string | null,
    marinade_stake: string,
    marinade_native_stake: string,
    activated_stake: string,
    epoch_stats: ValidatorEpoch[]
}

export const selectTotalMarinadeStake = (validator: Validator) => Math.round(Number(lamportsToSol(validator.marinade_stake)) + Number(lamportsToSol(validator.marinade_native_stake)))

export const selectVoteAccount = (validator: Validator) => validator.vote_account

export const selectName = (validator: Validator) => validator.info_name ?? '---'

export type ValidatorsResponse = {
    validators: Validator[]
}

export const fetchValidators = async (): Promise<ValidatorsResponse> => fetchValidatorsWithEpochs(0)

export const fetchValidatorsWithEpochs = async (epochs: number): Promise<ValidatorsResponse> => {
    const res = await fetch(`https://validators-api.marinade.finance/validators?limit=9999&epochs=${epochs}`);
    return res.json();
};

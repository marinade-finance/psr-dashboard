import { BondRecord, fetchBonds, selectMaxProtectedStake } from "./bonds";
import { Validator, fetchValidators, selectTotalMarinadeStake } from "./validators";

export type ValidatorWithBond = {
    validator: Validator
    bond: BondRecord | null
}

export const selectProtectedStake = ({ validator, bond }: ValidatorWithBond) => Math.round(Math.min(bond ? selectMaxProtectedStake(bond) : 0, selectTotalMarinadeStake(validator)))
export const selectProtectedStakePct = ({ validator, bond }: ValidatorWithBond) => selectTotalMarinadeStake(validator) === 0 ? 0 : Math.round(Math.min(bond ? selectMaxProtectedStake(bond) : 0, selectTotalMarinadeStake(validator))) / selectTotalMarinadeStake(validator)

export const fetchValidatorsWithBonds = async (): Promise<ValidatorWithBond[]> => {
    const [{ validators }, { bonds }] = await Promise.all([fetchValidators(), fetchBonds()])

    const validatorsWithBonds: Record<string, ValidatorWithBond> = {}

    for (const validator of validators) {
        validatorsWithBonds[validator.vote_account] = { validator, bond: null }
    }

    for (const bond of bonds) {
        if (validatorsWithBonds[bond.vote_account]) {
            validatorsWithBonds[bond.vote_account].bond = bond
        }
    }

    return Object.values(validatorsWithBonds)
};

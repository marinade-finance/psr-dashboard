import { BondRecord, fetchBonds, selectMaxProtectedStake } from "./bonds"
import { Validator, fetchValidators, selectTotalMarinadeStake } from "./validators"
import { loadSam } from "./sam"
import { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

export type ValidatorWithBond = {
    validator: Validator
    auction?: AuctionValidator
    bond: BondRecord | null
}

export const selectProtectedStake = ({ validator, bond }: ValidatorWithBond) =>
  Math.round(Math.min(bond ? selectMaxProtectedStake(bond) : 0, selectTotalMarinadeStake(validator)))
export const selectMaxStakeWanted = (bond: BondRecord) => bond.max_stake_wanted / 1e9

export const fetchValidatorsWithBonds = async (): Promise<ValidatorWithBond[]> => {
  const [{ validators }, { bonds }, { auctionResult }] = await Promise.all([fetchValidators(), fetchBonds(), loadSam()])

    const validatorsWithBonds: Record<string, ValidatorWithBond> = {}

    for (const validator of validators) {
        const auction = auctionResult.auctionData.validators.find(({ voteAccount }) => voteAccount === validator.vote_account)
        validatorsWithBonds[validator.vote_account] = { validator, bond: null, auction }
    }

    for (const bond of bonds) {
        if (validatorsWithBonds[bond.vote_account]) {
            validatorsWithBonds[bond.vote_account].bond = bond
        }
    }

    return Object.values(validatorsWithBonds)
};

import { fetchBonds, selectEffectiveAmount } from './bonds'
import { loadSam } from './sam'
import { fetchValidators, selectTotalMarinadeStake } from './validators'

import type { BondRecord } from './bonds'
import type { Validator } from './validators'
import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

export type ValidatorWithBond = {
  validator: Validator
  auction?: AuctionValidator
  bond: BondRecord | null
}

export const selectMaxProtectedStake = ({
  bond,
  auction,
}: ValidatorWithBond) => {
  const effBondBalance = bond ? selectEffectiveAmount(bond) : 0
  const participatingTotalBidPmpe = auction
    ? auction.revShare.inflationPmpe +
      auction.revShare.mevPmpe +
      auction.revShare.effParticipatingBidPmpe
    : Infinity
  return Math.max(0, effBondBalance / (participatingTotalBidPmpe / 1000))
}

export const selectProtectedStake = (entry: ValidatorWithBond) =>
  Math.round(
    Math.min(
      entry.bond ? selectMaxProtectedStake(entry) : 0,
      selectTotalMarinadeStake(entry.validator),
    ),
  )

export const selectMaxStakeWanted = (bond: BondRecord) =>
  bond.max_stake_wanted / 1e9

export const fetchValidatorsWithBonds = async (): Promise<
  ValidatorWithBond[]
> => {
  const [{ validators }, { bonds }, { auctionResult }] = await Promise.all([
    fetchValidators(),
    fetchBonds(),
    loadSam(),
  ])

  const validatorsWithBonds: Record<string, ValidatorWithBond> = {}

  for (const validator of validators) {
    const auction = auctionResult.auctionData.validators.find(
      ({ voteAccount }) => voteAccount === validator.vote_account,
    )
    validatorsWithBonds[validator.vote_account] = {
      validator,
      bond: null,
      auction,
    }
  }

  for (const bond of bonds) {
    if (validatorsWithBonds[bond.vote_account]) {
      validatorsWithBonds[bond.vote_account].bond = bond
    }
  }

  return Object.values(validatorsWithBonds)
}

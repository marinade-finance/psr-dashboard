import { fetchBonds, selectEffectiveAmount } from './bonds'
import { loadSam } from './sam'
import {
  fetchValidatorsWithEpochs,
  selectTotalMarinadeStake,
} from './validators'

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
  if (participatingTotalBidPmpe === 0) return 0
  return Math.max(0, effBondBalance / (participatingTotalBidPmpe / 1000))
}

export const selectProtectedStake = (entry: ValidatorWithBond) =>
  Math.round(
    Math.min(
      entry.bond ? selectMaxProtectedStake(entry) : 0,
      selectTotalMarinadeStake(entry.validator),
    ),
  )

export const fetchValidatorsWithBonds = async (): Promise<
  ValidatorWithBond[]
> => {
  const [{ validators }, { bonds }, { auctionResult }] = await Promise.all([
    fetchValidatorsWithEpochs(0),
    fetchBonds(),
    loadSam(),
  ])

  // Index the auction once so the per-validator lookup is O(1) instead of
  // a linear .find() scan per row (≈N² with ~700 validators).
  const auctionByVoteAccount = new Map<string, AuctionValidator>()
  for (const v of auctionResult.auctionData.validators) {
    auctionByVoteAccount.set(v.voteAccount, v)
  }

  const validatorsWithBonds: Record<string, ValidatorWithBond> = {}

  for (const validator of validators) {
    validatorsWithBonds[validator.vote_account] = {
      validator,
      bond: null,
      auction: auctionByVoteAccount.get(validator.vote_account),
    }
  }

  for (const bond of bonds) {
    if (validatorsWithBonds[bond.vote_account]) {
      validatorsWithBonds[bond.vote_account].bond = bond
    }
  }

  return Object.values(validatorsWithBonds)
}

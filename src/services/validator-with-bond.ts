import { fetchBonds, selectEffectiveAmount } from './bonds'
import { loadSam } from './sam'
import {
  fetchValidatorsWithEpochs,
  selectTotalMarinadeStake,
} from './validators'

import type { BondRecord } from './bonds'
import type { Validator } from './validators'
import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'
import type { QueryClient } from '@tanstack/react-query'

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
  Math.min(
    entry.bond ? selectMaxProtectedStake(entry) : 0,
    selectTotalMarinadeStake(entry.validator),
  )

// Takes a QueryClient so the shared loadSam() result is read from the canonical
// ['sam'] cache via ensureQueryData — if SamPage / EpochMeter / another consumer
// is already fetching or has fetched it, this is a free cache read instead of
// a duplicate in-browser SDK run.
export const fetchValidatorsWithBonds = async (
  qc: QueryClient,
  signal?: AbortSignal,
): Promise<ValidatorWithBond[]> => {
  const [{ validators }, { bonds }, { auctionResult }] = await Promise.all([
    fetchValidatorsWithEpochs(0, signal),
    fetchBonds(signal),
    qc.ensureQueryData({ queryKey: ['sam'], queryFn: () => loadSam() }),
  ])

  const auctionByVoteAccount = new Map<string, AuctionValidator>()
  for (const validator of auctionResult.auctionData.validators) {
    auctionByVoteAccount.set(validator.voteAccount, validator)
  }

  const bondByVoteAccount = new Map<string, BondRecord>()
  for (const bond of bonds) {
    bondByVoteAccount.set(bond.vote_account, bond)
  }

  const validatorsWithBonds: Record<string, ValidatorWithBond> = {}

  for (const validator of validators) {
    const hasMarinade =
      Number(validator.marinade_stake) > 0 ||
      Number(validator.marinade_native_stake) > 0
    const hasBond = bondByVoteAccount.has(validator.vote_account)
    if (!hasMarinade && !hasBond) continue
    validatorsWithBonds[validator.vote_account] = {
      validator,
      bond: bondByVoteAccount.get(validator.vote_account) ?? null,
      auction: auctionByVoteAccount.get(validator.vote_account),
    }
  }

  return Object.values(validatorsWithBonds)
}

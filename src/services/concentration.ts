// Per-validator country / ASO concentration, computed on the SAME basis the
// auction enforces the caps on.
//
// This deliberately shadows `selectValidatorConcentration` from
// @marinade.finance/ds-sam-calc, which divides the group's summed
// `marinadeSamTargetSol` by the auction's total SAM target — a share of
// Marinade's SAM TVL. The caps rendered next to it
// (`maxNetworkStakeConcentrationPer{Country,Aso}Dec`, live 40% / 30%) are
// enforced against TOTAL NETWORK stake: the SDK builds them as
// `networkTotalSol * cap` and draws them down by
// `externalActivatedSol + marinadeSamTargetSol` per validator. Comparing a
// share-of-Marinade-TVL number against a share-of-network cap let the card
// print figures above their own cap with nothing capped (epoch 1019: Germany
// "45.1% of 40% cap").
//
// So: numerator = every group member's `externalActivatedSol +
// marinadeSamTargetSol` (validators with no SAM target included — they still
// occupy network stake in the group and the auction's cap draw-down counts
// them), denominator = `networkTotalSol`. `capPct` is unchanged.
//
// `src/services/sdk-rerun.ts:22-27` already rebuilds the network caps
// dashboard-side the same way.
import { AuctionConstraintType } from '@marinade.finance/ds-sam-sdk'

import type {
  ConcentrationContext,
  ValidatorConcentration,
} from '@marinade.finance/ds-sam-calc'
import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Rendered when a validator has no country / ASO on record.
const UNKNOWN_GROUP = '—'

// What the auction's country / ASO caps are drawn down by, per validator.
const networkStakeSol = (validator: AuctionValidator): number =>
  validator.auctionStake.externalActivatedSol +
  validator.auctionStake.marinadeSamTargetSol

export const selectValidatorConcentration = (
  auctionResult: AuctionResult,
  config: DsSamConfig,
  voteAccount: string,
): ValidatorConcentration | null => {
  const { validators, stakeAmounts } = auctionResult.auctionData
  const self = validators.find(v => v.voteAccount === voteAccount)
  if (!self) return null

  const networkTotalSol = stakeAmounts.networkTotalSol

  const context = (
    pick: (validator: AuctionValidator) => string,
    capType: AuctionConstraintType,
    capPct: number,
  ): ConcentrationContext => {
    const key = pick(self) || UNKNOWN_GROUP
    let groupStake = 0
    let groupValidatorCount = 0
    for (const validator of validators) {
      if ((pick(validator) || UNKNOWN_GROUP) !== key) continue
      groupStake += networkStakeSol(validator)
      groupValidatorCount += 1
    }
    return {
      label: key,
      pctOfTotal: networkTotalSol > 0 ? groupStake / networkTotalSol : 0,
      capPct,
      groupValidatorCount,
      thisValidatorCapped:
        self.lastCapConstraint?.constraintType === capType &&
        self.lastCapConstraint.constraintName === pick(self),
    }
  }

  return {
    country: context(
      validator => validator.country,
      AuctionConstraintType.COUNTRY,
      config.maxNetworkStakeConcentrationPerCountryDec,
    ),
    aso: context(
      validator => validator.aso,
      AuctionConstraintType.ASO,
      config.maxNetworkStakeConcentrationPerAsoDec,
    ),
  }
}

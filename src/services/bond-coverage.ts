import { finite } from 'src/format'
import { selectPaidUndelegationSol } from 'src/services/sam'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

export type BondCoverage = {
  minEp: number
  idealEp: number
  bondBalanceSol: number
  claimableBondBalanceSol: number
  marinadeActivatedStakeSol: number
  expectedMaxEffBidPmpe: number
  onchainDistributedPmpe: number
  // Two stake bases:
  //   currentExposedStakeSol  — full active − unprotected. Drives "keep stake" sizing.
  //   projectedExposedStakeSol — current minus pending undelegations. Drives the
  //     SDK's penalty trigger and the bondRiskFee charge.
  currentExposedStakeSol: number
  projectedExposedStakeSol: number
  carriedPaidUndelegationSol: number
  minUnprotectedReserveSol: number
  idealUnprotectedReserveSol: number
  // One-epoch rewards-delivery insurance baked into both floors. Doesn't
  // scale with the epoch horizon — it's the same piece in min/ideal.
  rewardsGuaranteeKeep: number
  rewardsGuaranteeIdeal: number
  // Coverage section (current basis): "keep your stake"
  minCoverageBidKeep: number
  // Bid coverage summed across exposed + unprotected stake — the single
  // "Held for bid payments" row that the UI surfaces.
  heldForBidKeep: number
  heldForBidIdeal: number
  floorBaseKeep: number
  topUpToKeepStake: number
  idealCoverageBidKeep: number
  requiredIdealKeep: number
  topUpToIdealKeep: number
  // Risk section (projected basis): SDK penalty trigger
  floorBaseProjected: number
  topUpToAvoidFee: number
}

export function computeBondCoverage(
  v: AuctionValidator,
  minBondEpochs: number,
  idealBondEpochs: number,
  winningTotalPmpe: number,
  bondRiskFeeMult: number,
): BondCoverage {
  const bondBalanceSol = v.bondBalanceSol ?? 0
  const claimableBondBalanceSol = v.claimableBondBalanceSol ?? 0
  const marinadeActivatedStakeSol = v.marinadeActivatedStakeSol
  const paidUndelegationSol = selectPaidUndelegationSol(v)
  const expectedMaxEffBidPmpe = finite(v.revShare?.expectedMaxEffBidPmpe)
  const onchainDistributedPmpe = finite(v.revShare?.onchainDistributedPmpe)
  const unprotectedStakeSol = v.unprotectedStakeSol ?? 0

  // Strip this cycle's freshly-charged undelegation so the projection isn't
  // implicitly re-charging on the already-penalized base. Bond-risk fresh
  // contribution to paidUndelegationSol is min(1, mult) * value (SDK
  // calculations.js:94).
  const freshBondRiskUndel =
    (v.bondForcedUndelegation?.value ?? 0) * Math.min(1, bondRiskFeeMult)
  const freshBidTooLowUndel =
    winningTotalPmpe > 0
      ? ((v.revShare?.bidTooLowPenaltyPmpe ?? 0) * marinadeActivatedStakeSol) /
        winningTotalPmpe
      : 0
  const carriedPaidUndelegationSol = Math.max(
    0,
    paidUndelegationSol - freshBondRiskUndel - freshBidTooLowUndel,
  )

  const projectedActivatedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - carriedPaidUndelegationSol,
  )
  const projectedExposedStakeSol = Math.max(
    0,
    projectedActivatedStakeSol - unprotectedStakeSol,
  )

  const minUnprotectedReserveSol = finite(v.minUnprotectedReserve)
  const idealUnprotectedReserveSol = finite(v.idealUnprotectedReserve)

  const minEp = 1 + minBondEpochs
  const idealEp = 1 + idealBondEpochs

  const minBondPmpe = finite(v.minBondPmpe)
  const idealBondPmpe = finite(v.idealBondPmpe)

  // Current basis: full active stake (no undelegation subtraction).
  // Drives "keep your stake" sizing — what bond is required to cover what
  // the validator currently has, so the protocol won't trigger any further
  // undelegation next epoch.
  const currentExposedStakeSol = Math.max(
    0,
    marinadeActivatedStakeSol - unprotectedStakeSol,
  )
  const minCoverageBidKeep =
    ((minEp * expectedMaxEffBidPmpe) / 1000) * currentExposedStakeSol
  const rewardsGuaranteeKeep =
    (onchainDistributedPmpe / 1000) * currentExposedStakeSol
  // "Held for bid payments" — bid coverage across both exposed and unprotected
  // stake portions. Hides the unprotected-vs-exposed split which is 0 for most
  // SAM-delegated validators anyway.
  const heldForBidKeep = minCoverageBidKeep + minUnprotectedReserveSol
  const floorBaseKeep =
    minUnprotectedReserveSol + (minBondPmpe / 1000) * currentExposedStakeSol
  const topUpToKeepStake = Math.max(0, floorBaseKeep - claimableBondBalanceSol)

  const idealCoverageBidKeep =
    ((idealEp * expectedMaxEffBidPmpe) / 1000) * currentExposedStakeSol
  const rewardsGuaranteeIdeal = rewardsGuaranteeKeep
  const heldForBidIdeal = idealCoverageBidKeep + idealUnprotectedReserveSol
  const requiredIdealKeep =
    idealUnprotectedReserveSol + (idealBondPmpe / 1000) * currentExposedStakeSol
  const topUpToIdealKeep = Math.max(0, requiredIdealKeep - bondBalanceSol)

  // Projected basis: post-undelegation. Mirrors the SDK's fee trigger:
  //   claimableBond >= minUnprotectedReserve + projectedExposed * minBondPmpe/1000
  // Used only for the Bond Risk section (top up to avoid the fee).
  const floorBaseProjected =
    minUnprotectedReserveSol + (minBondPmpe / 1000) * projectedExposedStakeSol
  const topUpToAvoidFee = Math.max(
    0,
    floorBaseProjected - claimableBondBalanceSol,
  )

  return {
    minEp,
    idealEp,
    bondBalanceSol,
    claimableBondBalanceSol,
    marinadeActivatedStakeSol,
    expectedMaxEffBidPmpe,
    onchainDistributedPmpe,
    currentExposedStakeSol,
    projectedExposedStakeSol,
    carriedPaidUndelegationSol,
    minUnprotectedReserveSol,
    idealUnprotectedReserveSol,
    rewardsGuaranteeKeep,
    rewardsGuaranteeIdeal,
    minCoverageBidKeep,
    heldForBidKeep,
    heldForBidIdeal,
    floorBaseKeep,
    topUpToKeepStake,
    idealCoverageBidKeep,
    requiredIdealKeep,
    topUpToIdealKeep,
    floorBaseProjected,
    topUpToAvoidFee,
  }
}

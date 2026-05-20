import {
  Auction,
  AuctionConstraints,
  Debug,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'
import { calcValidatorRevShare } from '@marinade.finance/ds-sam-sdk/dist/src/calculations'

import type {
  AuctionConstraintsConfig,
  AuctionData,
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { AppOverrides } from 'src/services/simulation'

function buildConstraintsConfig(
  config: DsSamConfig,
  data: AuctionData,
): AuctionConstraintsConfig {
  const { networkTotalSol, marinadeSamTvlSol } = data.stakeAmounts
  const marinadeTotalTvlSol = marinadeSamTvlSol
  return {
    totalCountryStakeCapSol:
      networkTotalSol * config.maxNetworkStakeConcentrationPerCountryDec,
    totalAsoStakeCapSol:
      networkTotalSol * config.maxNetworkStakeConcentrationPerAsoDec,
    marinadeCountryStakeCapSol:
      marinadeTotalTvlSol * config.maxMarinadeStakeConcentrationPerCountryDec,
    marinadeAsoStakeCapSol:
      marinadeTotalTvlSol * config.maxMarinadeStakeConcentrationPerAsoDec,
    marinadeValidatorStakeCapSol:
      marinadeTotalTvlSol * config.maxMarinadeTvlSharePerValidatorDec,
    minBondBalanceSol: config.minBondBalanceSol,
    minMaxStakeWanted: config.minMaxStakeWanted ?? Infinity,
    minBondEpochs: config.minBondEpochs,
    idealBondEpochs: config.idealBondEpochs,
    unprotectedValidatorStakeCapSol:
      marinadeTotalTvlSol * config.maxUnprotectedStakePerValidatorDec,
    minUnprotectedStakeToDelegateSol: config.minUnprotectedStakeToDelegateSol,
    unprotectedFoundationStakeDec: config.unprotectedFoundationStakeDec,
    unprotectedDelegatedStakeDec: config.unprotectedDelegatedStakeDec,
    bondObligationSafetyMult: config.bondObligationSafetyMult,
    bondSamHealthMult: config.bondSamHealthMult,
  }
}

export function runSdkRerun(
  baseAuctionData: AuctionData,
  config: DsSamConfig,
  overrides: AppOverrides | null,
): AuctionResult {
  const debug = new Debug(new Set(), LogVerbosity.ERROR)
  const source = overrides?.source

  const validators: AuctionValidator[] = baseAuctionData.validators.map(v => {
    const infl = source?.inflationCommissionsDec.get(v.voteAccount)
    const mev = source?.mevCommissionsDec.get(v.voteAccount)
    const blk = source?.blockRewardsCommissionsDec.get(v.voteAccount)
    const bid = source?.cpmpesDec.get(v.voteAccount)
    const bond = overrides?.bondBalanceSol.get(v.voteAccount)

    // Deep-clone values + auctionStake on EVERY row: Auction.evaluate()
    // mutates validator.values (bondRiskFeeSol, paidUndelegationSol, …) and
    // validator.auctionStake (marinadeSamTargetSol). Sharing those refs with
    // the base AuctionData would leak mutations back into the fixture/
    // upstream snapshot across reruns.
    const clonedValues = {
      ...v.values,
      commissions: { ...v.values.commissions },
    }
    const clonedAuctionStake = { ...v.auctionStake }

    const commissionTouched =
      infl !== undefined ||
      mev !== undefined ||
      blk !== undefined ||
      bid !== undefined
    if (!commissionTouched && bond === undefined) {
      return { ...v, values: clonedValues, auctionStake: clonedAuctionStake }
    }

    const inflationCommissionDec = infl ?? v.inflationCommissionDec
    const mevCommissionDec = mev ?? v.mevCommissionDec
    const blockRewardsCommissionDec = blk ?? v.blockRewardsCommissionDec
    const bidCpmpe = bid ?? v.bidCpmpe
    // Bond override applies to BOTH gross and claimable — the topped-up
    // amount is fully available. Auction.evaluate() reads these when
    // sizing bondStakeCapSam, bondRiskFee, etc.
    const bondBalanceSol = bond ?? v.bondBalanceSol
    const claimableBondBalanceSol = bond ?? v.claimableBondBalanceSol

    const revShare = !commissionTouched
      ? v.revShare
      : calcValidatorRevShare(
          {
            voteAccount: v.voteAccount,
            inflationCommissionDec,
            mevCommissionDec,
            blockRewardsCommissionDec,
            bidCpmpe,
            values: { commissions: clonedValues.commissions },
          },
          baseAuctionData.rewards,
        )

    return {
      ...v,
      values: clonedValues,
      auctionStake: clonedAuctionStake,
      inflationCommissionDec,
      mevCommissionDec,
      blockRewardsCommissionDec,
      bidCpmpe,
      bondBalanceSol,
      claimableBondBalanceSol,
      revShare,
    }
  })

  const clonedAuctionData: AuctionData = {
    ...baseAuctionData,
    validators,
  }

  const constraintsConfig = buildConstraintsConfig(config, clonedAuctionData)
  const constraints = new AuctionConstraints(constraintsConfig, debug)
  const auction = new Auction(clonedAuctionData, constraints, config, debug)
  return auction.evaluate()
}

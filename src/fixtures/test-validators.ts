/**
 * Synthetic fixture data for the /test- route.
 * Covers every meaningful validator state without real API calls.
 */
import { InputsSource, LogVerbosity } from '@marinade.finance/ds-sam-sdk'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Realistic epoch / TVL constants
const TVL = 1_200_000
const EPOCH = 800
const WINNING_PMPE = 2.8

// Shared history: 3 auction entries per validator so bid-penalty logic has data
function makeAuctions(bidPmpe: number, winningPmpe: number) {
  return [EPOCH - 2, EPOCH - 1, EPOCH].map(epoch => ({
    epoch,
    winningTotalPmpe: winningPmpe,
    auctionEffectiveBidPmpe: bidPmpe,
    activatingStakePmpe: 0,
    effParticipatingBidPmpe: bidPmpe,
    bidPmpe,
    totalPmpe: bidPmpe + 3.5,
    bondObligationPmpe: 0,
    commissions: {
      inflationCommissionDec: 0.05,
      mevCommissionDec: 0.05,
      blockRewardsCommissionDec: 1.0,
      inflationCommissionOnchainDec: 0.05,
      inflationCommissionInBondDec: 0.05,
      mevCommissionOnchainDec: 0.05,
      mevCommissionInBondDec: 0.05,
      blockRewardsCommissionInBondDec: 1.0,
    },
  }))
}

function makeRevShare(
  bidPmpe: number,
  penaltyPmpe = 0,
  inflPmpe = 4.1,
  mevPmpe = 0.9,
) {
  return {
    totalPmpe: inflPmpe + mevPmpe + bidPmpe,
    inflationPmpe: inflPmpe,
    mevPmpe,
    bidPmpe,
    blockPmpe: 0,
    onchainDistributedPmpe: inflPmpe + mevPmpe,
    bondObligationPmpe: 0,
    auctionEffectiveStaticBidPmpe: bidPmpe,
    auctionEffectiveBidPmpe: bidPmpe,
    activatingStakePmpe: 0,
    bidTooLowPenaltyPmpe: penaltyPmpe,
    effParticipatingBidPmpe: bidPmpe,
    expectedMaxEffBidPmpe: bidPmpe,
    blacklistPenaltyPmpe: 0,
  }
}

function makeValues(opts: {
  bondBalanceSol: number
  marinadeActivatedStakeSol: number
  inflComm?: number
  mevComm?: number
}) {
  const inflComm = opts.inflComm ?? 0.05
  const mevComm = opts.mevComm ?? 0.05
  return {
    bondBalanceSol: opts.bondBalanceSol,
    marinadeActivatedStakeSol: opts.marinadeActivatedStakeSol,
    bondRiskFeeSol: 0,
    paidUndelegationSol: 0,
    samBlacklisted: false,
    commissions: {
      inflationCommissionDec: inflComm,
      mevCommissionDec: mevComm,
      blockRewardsCommissionDec: 1.0,
      inflationCommissionOnchainDec: inflComm,
      inflationCommissionInBondDec: inflComm,
      mevCommissionOnchainDec: mevComm,
      mevCommissionInBondDec: mevComm,
      blockRewardsCommissionInBondDec: 1.0,
    },
  }
}

function makeBase(
  voteAccount: string,
  opts: {
    inflationCommissionDec?: number
    mevCommissionDec?: number | null
    blockRewardsCommissionDec?: number | null
    bidCpmpe?: number | null
    marinadeActivatedStakeSol?: number
    totalActivatedStakeSol?: number
    bondBalanceSol?: number
    maxStakeWanted?: number | null
  } = {},
): Omit<
  AuctionValidator,
  | 'revShare'
  | 'bidTooLowPenalty'
  | 'bondForcedUndelegation'
  | 'samEligible'
  | 'backstopEligible'
  | 'samBlocked'
  | 'auctionStake'
  | 'lastCapConstraint'
  | 'stakePriority'
  | 'unstakePriority'
  | 'maxBondDelegation'
  | 'bondSamStakeCapSol'
  | 'unprotectedStakeCapSol'
  | 'unprotectedStakeSol'
  | 'minBondPmpe'
  | 'idealBondPmpe'
  | 'minUnprotectedReserve'
  | 'idealUnprotectedReserve'
  | 'bondGoodForNEpochs'
  | 'bondSamHealth'
  | 'values'
> {
  const active = opts.marinadeActivatedStakeSol ?? 50_000
  const bond = opts.bondBalanceSol ?? 20
  return {
    voteAccount,
    clientVersion: '1.18.26',
    voteCredits: 432000,
    aso: 'Hetzner Online GmbH',
    country: 'DE',
    bondBalanceSol: bond,
    claimableBondBalanceSol: 0,
    lastBondBalanceSol: bond,
    totalActivatedStakeSol: opts.totalActivatedStakeSol ?? active + 200_000,
    marinadeActivatedStakeSol: active,
    lastMarinadeActivatedStakeSol: active,
    lastSamBlacklisted: false,
    inflationCommissionDec: opts.inflationCommissionDec ?? 0.05,
    mevCommissionDec:
      opts.mevCommissionDec !== undefined ? opts.mevCommissionDec : 0.05,
    blockRewardsCommissionDec:
      opts.blockRewardsCommissionDec !== undefined
        ? opts.blockRewardsCommissionDec
        : 1.0,
    bidCpmpe: opts.bidCpmpe !== undefined ? opts.bidCpmpe : 2.5,
    maxStakeWanted:
      opts.maxStakeWanted !== undefined ? opts.maxStakeWanted : 500_000,
    foundationStakeSol: 0,
    selfStakeSol: 10_000,
    epochStats: [],
    auctions: makeAuctions(
      opts.bidCpmpe != null ? opts.bidCpmpe : 2.5,
      WINNING_PMPE,
    ),
  }
}

// ───── 12 fixture validators ─────────────────────────────────────────────────

// 1. In-set, healthy bond, gaining stake
const v01: AuctionValidator = {
  ...makeBase('FiXtUREv1111111111111111111111111111111111aa', {
    marinadeActivatedStakeSol: 40_000,
    bondBalanceSol: 25,
  }),
  revShare: makeRevShare(2.5),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 200_000, marinadeSamTargetSol: 55_000 },
  lastCapConstraint: null,
  stakePriority: 1,
  unstakePriority: 0,
  maxBondDelegation: 125_000,
  bondSamStakeCapSol: 125_000,
  unprotectedStakeCapSol: 5_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 30,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 25, marinadeActivatedStakeSol: 40_000 }),
}

// 2. In-set, healthy bond, losing stake
const v02: AuctionValidator = {
  ...makeBase('FiXtUREv2222222222222222222222222222222222bb', {
    marinadeActivatedStakeSol: 70_000,
    bondBalanceSol: 22,
    bidCpmpe: 2.3,
  }),
  revShare: makeRevShare(2.3),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 150_000, marinadeSamTargetSol: 50_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 1,
  maxBondDelegation: 110_000,
  bondSamStakeCapSol: 110_000,
  unprotectedStakeCapSol: 4_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 25,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 22, marinadeActivatedStakeSol: 70_000 }),
}

// 3. In-set, watch bond (60–84% util, ~15 epoch runway)
const v03: AuctionValidator = {
  ...makeBase('FiXtUREv3333333333333333333333333333333333cc', {
    marinadeActivatedStakeSol: 45_000,
    bondBalanceSol: 10, // ~90% utilization of bond*5000=50k → above 65% watch
    bidCpmpe: 2.4,
  }),
  revShare: makeRevShare(2.4),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 180_000, marinadeSamTargetSol: 48_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 50_000,
  bondSamStakeCapSol: 50_000,
  unprotectedStakeCapSol: 2_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.2,
  idealBondPmpe: 0.6,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 16, // runway = bondGoodForNEpochs - minBondEpochs(1) = 15
  bondSamHealth: 0.7,
  values: makeValues({ bondBalanceSol: 10, marinadeActivatedStakeSol: 45_000 }),
}

// 4. In-set, critical bond (<5 epochs runway)
const v04: AuctionValidator = {
  ...makeBase('FiXtUREv4444444444444444444444444444444444dd', {
    marinadeActivatedStakeSol: 30_000,
    bondBalanceSol: 6,
    bidCpmpe: 2.6,
  }),
  revShare: makeRevShare(2.6),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 100_000, marinadeSamTargetSol: 32_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 30_000,
  bondSamStakeCapSol: 30_000,
  unprotectedStakeCapSol: 1_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.5,
  idealBondPmpe: 0.8,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 3, // runway = 3 - 1 = 2 → red (< 5 epochs)
  bondSamHealth: 0.2,
  values: makeValues({ bondBalanceSol: 6, marinadeActivatedStakeSol: 30_000 }),
}

// 5. In-set, critical bond (>85% utilization)
const v05: AuctionValidator = {
  ...makeBase('FiXtUREv5555555555555555555555555555555555ee', {
    marinadeActivatedStakeSol: 43_500, // 43500/(8*5000)=~109% → cap at 100% → critical
    bondBalanceSol: 8,
    bidCpmpe: 2.5,
  }),
  revShare: makeRevShare(2.5),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 120_000, marinadeSamTargetSol: 44_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 40_000,
  bondSamStakeCapSol: 40_000,
  unprotectedStakeCapSol: 1_500,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.3,
  idealBondPmpe: 0.7,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 15, // decent runway but utilization is high
  bondSamHealth: 0.3,
  values: makeValues({ bondBalanceSol: 8, marinadeActivatedStakeSol: 43_500 }),
}

// 6. In-set, active bid-too-low penalty (bidTooLowPenaltyPmpe > 0)
const v06: AuctionValidator = {
  ...makeBase('FiXtUREv6666666666666666666666666666666666ff', {
    marinadeActivatedStakeSol: 35_000,
    bondBalanceSol: 15,
    bidCpmpe: 1.5, // below clearing price
  }),
  revShare: {
    ...makeRevShare(1.5, 0.8),
    auctionEffectiveBidPmpe: 1.5,
  },
  bidTooLowPenalty: { coef: 0.3, base: 0.5 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 90_000, marinadeSamTargetSol: 35_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 75_000,
  bondSamStakeCapSol: 75_000,
  unprotectedStakeCapSol: 3_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 20,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 15, marinadeActivatedStakeSol: 35_000 }),
}

// 7. In-set, at stake target (delta=0)
const v07: AuctionValidator = {
  ...makeBase('FiXtUREv7777777777777777777777777777777777gg', {
    marinadeActivatedStakeSol: 60_000,
    bondBalanceSol: 18,
    bidCpmpe: 2.8,
  }),
  revShare: makeRevShare(2.8),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 200_000, marinadeSamTargetSol: 60_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 90_000,
  bondSamStakeCapSol: 90_000,
  unprotectedStakeCapSol: 3_500,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 28,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 18, marinadeActivatedStakeSol: 60_000 }),
}

// 8. Out of set (marinadeSamTargetSol = 0, not winning)
const v08: AuctionValidator = {
  ...makeBase('FiXtUREv8888888888888888888888888888888888hh', {
    marinadeActivatedStakeSol: 10_000,
    bondBalanceSol: 12,
    bidCpmpe: 0.8, // too low to win
  }),
  revShare: makeRevShare(0.8),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: false,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 300_000, marinadeSamTargetSol: 0 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 1,
  maxBondDelegation: 60_000,
  bondSamStakeCapSol: 60_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 22,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 12, marinadeActivatedStakeSol: 10_000 }),
}

// 9. No MEV client (mevCommissionDec = null)
const v09: AuctionValidator = {
  ...makeBase('FiXtUREv9999999999999999999999999999999999ii', {
    marinadeActivatedStakeSol: 25_000,
    bondBalanceSol: 14,
    mevCommissionDec: null,
    bidCpmpe: 2.1,
  }),
  revShare: { ...makeRevShare(2.1, 0, 4.1, 0), mevPmpe: 0, totalPmpe: 6.2 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 80_000, marinadeSamTargetSol: 27_000 },
  lastCapConstraint: null,
  stakePriority: 1,
  unstakePriority: 0,
  maxBondDelegation: 70_000,
  bondSamStakeCapSol: 70_000,
  unprotectedStakeCapSol: 2_500,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 24,
  bondSamHealth: 1,
  values: {
    ...makeValues({
      bondBalanceSol: 14,
      marinadeActivatedStakeSol: 25_000,
      mevComm: 0,
    }),
    commissions: {
      ...makeValues({
        bondBalanceSol: 14,
        marinadeActivatedStakeSol: 25_000,
        mevComm: 0,
      }).commissions,
      mevCommissionDec: 0,
      mevCommissionOnchainDec: null,
      mevCommissionInBondDec: null,
    },
  },
}

// 10. High inflation commission (10%)
const v10: AuctionValidator = {
  ...makeBase('FiXtUREvaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaajj', {
    marinadeActivatedStakeSol: 20_000,
    bondBalanceSol: 16,
    inflationCommissionDec: 0.1,
    bidCpmpe: 2.2,
  }),
  revShare: { ...makeRevShare(2.2, 0, 3.5), totalPmpe: 3.5 + 0.9 + 2.2 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 70_000, marinadeSamTargetSol: 22_000 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 80_000,
  bondSamStakeCapSol: 80_000,
  unprotectedStakeCapSol: 2_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 26,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 16,
    marinadeActivatedStakeSol: 20_000,
    inflComm: 0.1,
  }),
}

// 11. Zero bid (bidPmpe = 0, edge case)
const v11: AuctionValidator = {
  ...makeBase('FiXtUREvaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkk', {
    marinadeActivatedStakeSol: 5_000,
    bondBalanceSol: 10,
    bidCpmpe: 0,
  }),
  revShare: { ...makeRevShare(0), bidPmpe: 0, auctionEffectiveBidPmpe: 0 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: false,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 50_000, marinadeSamTargetSol: 0 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 1,
  maxBondDelegation: 50_000,
  bondSamStakeCapSol: 50_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 35,
  bondSamHealth: 1,
  values: makeValues({ bondBalanceSol: 10, marinadeActivatedStakeSol: 5_000 }),
}

// 12. Max stake (near TVL cap, very large stake)
const v12: AuctionValidator = {
  ...makeBase('FiXtUREvaZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZll', {
    marinadeActivatedStakeSol: 240_000,
    bondBalanceSol: 60,
    bidCpmpe: 3.2,
    totalActivatedStakeSol: 800_000,
  }),
  revShare: makeRevShare(3.2, 0, 4.5, 1.1),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 400_000,
    marinadeSamTargetSol: 240_000,
  },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 300_000,
  bondSamStakeCapSol: 300_000,
  unprotectedStakeCapSol: 10_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 0.8,
  idealBondPmpe: 0.4,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 40,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 60,
    marinadeActivatedStakeSol: 240_000,
  }),
}

export const TEST_VALIDATORS: AuctionValidator[] = [
  v01,
  v02,
  v03,
  v04,
  v05,
  v06,
  v07,
  v08,
  v09,
  v10,
  v11,
  v12,
]

export const TEST_AUCTION_RESULT: AuctionResult = {
  winningTotalPmpe: WINNING_PMPE,
  auctionData: {
    epoch: EPOCH,
    validators: TEST_VALIDATORS,
    rewards: {
      inflationPmpe: 4.1,
      mevPmpe: 0.9,
      blockPmpe: 0,
    },
    stakeAmounts: {
      networkTotalSol: 400_000_000,
      marinadeSamTvlSol: TVL,
      marinadeRemainingSamSol: TVL - 500_000,
    },
    blacklist: new Set<string>(),
  },
}

// Thin config — only fields the UI reads directly
export const TEST_DS_SAM_CONFIG: DsSamConfig = {
  inputsSource: InputsSource.APIS,
  validatorsApiBaseUrl: '',
  bondsApiBaseUrl: '',
  tvlInfoApiBaseUrl: '',
  blacklistApiBaseUrl: '',
  scoringApiBaseUrl: '',
  enableZeroCommissionBackstop: false,
  rewardsEpochsCount: 10,
  validatorsUptimeEpochsCount: 10,
  validatorsUptimeThresholdDec: 0.9,
  validatorsClientVersionSemverExpr: '>=1.18',
  validatorsMaxEffectiveCommissionDec: 0.08,
  unprotectedFoundationStakeDec: 0.1,
  unprotectedDelegatedStakeDec: 0.1,
  bidTooLowPenaltyHistoryEpochs: 10,
  maxMarinadeStakeConcentrationPerCountryDec: 0.3,
  maxMarinadeStakeConcentrationPerAsoDec: 0.3,
  maxNetworkStakeConcentrationPerCountryDec: 0.3,
  maxNetworkStakeConcentrationPerAsoDec: 0.3,
  maxMarinadeTvlSharePerValidatorDec: 0.2,
  maxUnprotectedStakePerValidatorDec: 0.1,
  minUnprotectedStakeToDelegateSol: 1000,
  minBondBalanceSol: 0.1,
  minBondEpochs: 1,
  idealBondEpochs: 3,
  bondRiskFeeMult: 1.0,
  minMaxStakeWanted: null,
  expectedMaxWinningBidRatio: null,
  minExpectedEffBidPmpe: 0,
  expectedFeePmpe: 0,
  minEligibleFeePmpe: null,
  minimalCommission: null,
  bondObligationSafetyMult: 1.0,
  bidTooLowPenaltyPermittedDeviationPmpe: 0.0001,
  debugVoteAccounts: [],
  logVerbosity: LogVerbosity.ERROR,
}

// Epochs per year (same constant as sam.ts)
export const TEST_EPOCHS_PER_YEAR = (365.25 * 24 * 3600) / 172800

// Human-readable names for each fixture validator
export const TEST_VALIDATOR_NAMES = new Map<string, string>([
  ['FiXtUREv1111111111111111111111111111111111aa', 'Test: In-Set Gaining'],
  ['FiXtUREv2222222222222222222222222222222222bb', 'Test: In-Set Losing'],
  ['FiXtUREv3333333333333333333333333333333333cc', 'Test: Watch Bond'],
  [
    'FiXtUREv4444444444444444444444444444444444dd',
    'Test: Critical Bond (Low Epochs)',
  ],
  [
    'FiXtUREv5555555555555555555555555555555555ee',
    'Test: Critical Bond (High Util)',
  ],
  ['FiXtUREv6666666666666666666666666666666666ff', 'Test: Bid-Too-Low Penalty'],
  ['FiXtUREv7777777777777777777777777777777777gg', 'Test: At Stake Target'],
  ['FiXtUREv8888888888888888888888888888888888hh', 'Test: Out of Set'],
  ['FiXtUREv9999999999999999999999999999999999ii', 'Test: No MEV Client'],
  [
    'FiXtUREvaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaajj',
    'Test: High Inflation Commission',
  ],
  ['FiXtUREvaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkk', 'Test: Zero Bid'],
  ['FiXtUREvaZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZll', 'Test: Max Stake'],
])

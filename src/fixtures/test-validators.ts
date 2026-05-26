/**
 * Synthetic fixture data for the /test- route.
 * Covers every meaningful validator state without real API calls.
 */
import {
  AuctionConstraintType,
  InputsSource,
  LogVerbosity,
} from '@marinade.finance/ds-sam-sdk'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

// Realistic epoch / TVL constants. Sizes are scaled to Marinade mainnet
// magnitudes: SAM TVL ~6 M SOL, mid validators ~150–350 k active, large
// winners ~1 M, long-tail/critical rows a few k. All SOL quantities share
// ONE multiplier so the redelegation budget (TVL − Σ active) and the
// pro-rata natural-withdrawal stay sign-consistent — every gaining /
// losing / flat and bond-tier state is degree-1 homogeneous in this scale,
// so it survives unchanged. Bids / pmpe are intentionally NOT scaled
// (they set the winning line, independent of stake size).
const TVL = 6_000_000
const EPOCH = 800
// Clearing price MUST sit inside the validator totalPmpe spread
// (makeRevShare → 5.0 + bid, bids ~0–3.5 → totalPmpe ~5.0–8.8). Below this,
// rows fall under the winning price (bid too low) and the auction awards
// them zero — keep it consistent with each row's marinadeSamTargetSol.
const WINNING_PMPE = 6.0

// Real-sounding ASO names spread across the fixture so the ASO concentration
// breakdown shows a realistic distribution. HETZNER is deliberately over the
// 30% network cap (carried by v12 + v02); the rest sit comfortably under.
const C_US = 'United States'
const C_DE = 'Germany'
const C_FR = 'France'
const C_NL = 'Netherlands'
const C_GB = 'United Kingdom'

const ASO_HETZNER = 'Hetzner Online GmbH'
const ASO_AWS = 'Amazon Web Services'
const ASO_OVH = 'OVH SAS'
const ASO_GCP = 'Google Cloud'
const ASO_LATITUDE = 'Latitude.sh'
const ASO_TERASWITCH = 'Teraswitch Networks Inc.'
const ASO_CHERRY = 'Cherry Servers'
const ASO_EQUINIX = 'Equinix'
const ASO_VULTR = 'Vultr Holdings LLC'
const ASO_CONTABO = 'Contabo GmbH'

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
    claimableBondBalanceSol?: number
    maxStakeWanted?: number | null
    country?: string
    aso?: string
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
  const active = opts.marinadeActivatedStakeSol ?? 250_000
  const bond = opts.bondBalanceSol ?? 100
  return {
    voteAccount,
    clientVersion: '1.18.26',
    voteCredits: 432000,
    aso: opts.aso ?? ASO_HETZNER,
    country: opts.country ?? 'DE',
    bondBalanceSol: bond,
    claimableBondBalanceSol: opts.claimableBondBalanceSol ?? 0,
    lastBondBalanceSol: bond,
    totalActivatedStakeSol: opts.totalActivatedStakeSol ?? active + 1_000_000,
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
      opts.maxStakeWanted !== undefined ? opts.maxStakeWanted : 2_500_000,
    foundationStakeSol: 0,
    selfStakeSol: 50_000,
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
    marinadeActivatedStakeSol: 200_000,
    bondBalanceSol: 260,
    claimableBondBalanceSol: 260,
    country: C_DE,
    aso: ASO_OVH,
  }),
  revShare: makeRevShare(2.5),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 1_000_000,
    marinadeSamTargetSol: 275_000,
  },
  lastCapConstraint: null,
  stakePriority: 25,
  unstakePriority: 25,
  maxBondDelegation: 625_000,
  bondSamStakeCapSol: 625_000,
  unprotectedStakeCapSol: 25_000,
  unprotectedStakeSol: 15_000,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 30,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 260,
    marinadeActivatedStakeSol: 200_000,
  }),
}

// 2. In-set, healthy bond, losing stake
const v02: AuctionValidator = {
  ...makeBase('FiXtUREv2222222222222222222222222222222222bb', {
    marinadeActivatedStakeSol: 350_000,
    bondBalanceSol: 420,
    claimableBondBalanceSol: 420,
    bidCpmpe: 2.3,
    country: C_FR,
    aso: ASO_HETZNER,
  }),
  revShare: makeRevShare(2.3),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 750_000,
    marinadeSamTargetSol: 250_000,
  },
  // ASO concentration cap hit — Hetzner is over the 30% network cap on
  // /test-, so the ASO concentration tile renders "(capped)".
  lastCapConstraint: {
    constraintType: AuctionConstraintType.ASO,
    constraintName: ASO_HETZNER,
    totalStakeSol: 1_450_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 1_450_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  stakePriority: 23,
  unstakePriority: 23,
  maxBondDelegation: 550_000,
  bondSamStakeCapSol: 550_000,
  unprotectedStakeCapSol: 20_000,
  unprotectedStakeSol: 30_000,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 25,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 420,
    marinadeActivatedStakeSol: 350_000,
  }),
}

// 3. In-set, watch bond (60–84% util, ~15 epoch runway)
const v03: AuctionValidator = {
  ...makeBase('FiXtUREv3333333333333333333333333333333333cc', {
    marinadeActivatedStakeSol: 225_000,
    // Watch: 90k paid undelegation shrinks projected exposed to 135k, so the
    // projected floor (135k×1.2/1000 = 162) sits below claimable 200 → no
    // fee. But the keep floor on the full 225k (×1.2/1000 = 270) exceeds
    // claimable 200 → topUpToKeepStake > 0 → watch (orange), not critical.
    bondBalanceSol: 200,
    claimableBondBalanceSol: 200,
    bidCpmpe: 2.4,
    country: 'Finland',
    aso: ASO_GCP,
  }),
  revShare: makeRevShare(2.4),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 900_000,
    marinadeSamTargetSol: 240_000,
  },
  lastCapConstraint: null,
  stakePriority: 24,
  unstakePriority: 24,
  maxBondDelegation: 250_000,
  bondSamStakeCapSol: 250_000,
  unprotectedStakeCapSol: 10_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.2,
  idealBondPmpe: 0.6,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 16, // runway = bondGoodForNEpochs - minBondEpochs(1) = 15
  bondSamHealth: 0.7,
  values: {
    ...makeValues({
      bondBalanceSol: 200,
      marinadeActivatedStakeSol: 225_000,
    }),
    paidUndelegationSol: 90_000,
  },
}

// 4. In-set, critical bond (<5 epochs runway)
const v04: AuctionValidator = {
  ...makeBase('FiXtUREv4444444444444444444444444444444444dd', {
    marinadeActivatedStakeSol: 150_000,
    // Genuinely critical: bond 30 ≥ 5 (not below-min) but claimable 12 sits
    // far under the projected floor (150k×1.5/1000 = 225) → fee charged →
    // critical. Reinforced by bondGoodForNEpochs 3 (< 5 runway).
    bondBalanceSol: 30,
    claimableBondBalanceSol: 12,
    bidCpmpe: 2.6,
    country: 'Canada',
    aso: ASO_AWS,
  }),
  revShare: makeRevShare(2.6),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 500_000,
    marinadeSamTargetSol: 160_000,
  },
  lastCapConstraint: null,
  stakePriority: 26,
  unstakePriority: 26,
  maxBondDelegation: 150_000,
  bondSamStakeCapSol: 150_000,
  unprotectedStakeCapSol: 5_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.5,
  idealBondPmpe: 0.8,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 3, // runway = 3 - 1 = 2 → red (< 5 epochs)
  bondSamHealth: 0.2,
  values: makeValues({
    bondBalanceSol: 30,
    marinadeActivatedStakeSol: 150_000,
  }),
}

// 5. In-set, critical bond (>85% utilization)
const v05: AuctionValidator = {
  ...makeBase('FiXtUREv5555555555555555555555555555555555ee', {
    marinadeActivatedStakeSol: 217_500, // bond floor heavily over-utilised → critical
    bondBalanceSol: 40,
    claimableBondBalanceSol: 30, // ≪ projected floor (217.5k×1.3/1000 = 283)
    bidCpmpe: 2.5,
    country: C_US,
    aso: ASO_LATITUDE,
  }),
  revShare: makeRevShare(2.5),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 600_000,
    marinadeSamTargetSol: 220_000,
  },
  lastCapConstraint: null,
  stakePriority: 25,
  unstakePriority: 25,
  maxBondDelegation: 200_000,
  bondSamStakeCapSol: 200_000,
  unprotectedStakeCapSol: 7_500,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.3,
  idealBondPmpe: 0.7,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 15, // decent runway but utilization is high
  bondSamHealth: 0.3,
  values: makeValues({
    bondBalanceSol: 40,
    marinadeActivatedStakeSol: 217_500,
  }),
}

// 6. In-set, healthy bond, active bid-too-low penalty → primary CTA is the
//    bid penalty. Bond is deliberately healthy (balance + claimable above
//    every coverage floor) so the bond cascade does NOT shadow the bid CTA.
const v06: AuctionValidator = {
  ...makeBase('FiXtUREv6666666666666666666666666666666666ff', {
    marinadeActivatedStakeSol: 175_000,
    bondBalanceSol: 200,
    bidCpmpe: 1.5,
    country: 'Japan',
    aso: ASO_EQUINIX,
  }),
  claimableBondBalanceSol: 200,
  revShare: {
    ...makeRevShare(1.5, 0.8),
    auctionEffectiveBidPmpe: 1.5,
  },
  // Drop history sets last-epoch bid above this epoch's 1.5 — exercises the
  // bid-decrease branch in computeBidPenalty so the breakdown and the CTA
  // both report a penalty. (Without this, makeAuctions emits three identical
  // bidPmpe entries and isNegativeBiddingChange resolves to false.)
  auctions: makeAuctions(2.5, 2.5).map((a, i) => ({
    ...a,
    bidPmpe: i < 2 ? 2.5 : 1.5,
    auctionEffectiveBidPmpe: i < 2 ? 2.5 : 1.5,
    effParticipatingBidPmpe: i < 2 ? 2.5 : 1.5,
  })),
  bidTooLowPenalty: { coef: 0.3, base: 0.5 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 450_000,
    marinadeSamTargetSol: 175_000,
  },
  lastCapConstraint: null,
  stakePriority: 15,
  unstakePriority: 15,
  maxBondDelegation: 375_000,
  bondSamStakeCapSol: 375_000,
  unprotectedStakeCapSol: 15_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 20,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 200,
    marinadeActivatedStakeSol: 175_000,
  }),
}

// 7. In-set, at stake target (delta=0)
const v07: AuctionValidator = {
  ...makeBase('FiXtUREv7777777777777777777777777777777777gg', {
    marinadeActivatedStakeSol: 300_000,
    bondBalanceSol: 360,
    claimableBondBalanceSol: 360,
    bidCpmpe: 2.8,
    country: C_US,
    aso: ASO_AWS,
  }),
  revShare: makeRevShare(2.8),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 1_000_000,
    marinadeSamTargetSol: 300_000,
  },
  lastCapConstraint: null,
  stakePriority: 28,
  unstakePriority: 28,
  maxBondDelegation: 450_000,
  bondSamStakeCapSol: 450_000,
  unprotectedStakeCapSol: 17_500,
  unprotectedStakeSol: 25_000,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 28,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 360,
    marinadeActivatedStakeSol: 300_000,
  }),
}

// 8. Eligible but bid below the winning price → zero target, loses all stake
const v08: AuctionValidator = {
  ...makeBase('FiXtUREv8888888888888888888888888888888888hh', {
    marinadeActivatedStakeSol: 50_000,
    // Healthy bond (claimable 80 ≥ floor 50k×1/1000 = 50) so the below-line
    // "Bid too low" rank CTA isn't shadowed by a bond CTA.
    bondBalanceSol: 80,
    claimableBondBalanceSol: 80,
    bidCpmpe: 0.8, // totalPmpe 5.8 < winning 6.0 → below the line
    country: C_US,
    aso: ASO_AWS,
  }),
  revShare: makeRevShare(0.8),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 1_500_000, marinadeSamTargetSol: 0 },
  lastCapConstraint: null,
  stakePriority: 8,
  unstakePriority: 8,
  maxBondDelegation: 300_000,
  bondSamStakeCapSol: 300_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 22,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 80,
    marinadeActivatedStakeSol: 50_000,
  }),
}

// 9. No MEV client (mevCommissionDec = null)
const v09: AuctionValidator = {
  ...makeBase('FiXtUREv9999999999999999999999999999999999ii', {
    marinadeActivatedStakeSol: 125_000,
    bondBalanceSol: 160,
    claimableBondBalanceSol: 160,
    mevCommissionDec: null,
    bidCpmpe: 2.1,
    country: C_US,
    aso: ASO_VULTR,
  }),
  revShare: { ...makeRevShare(2.1, 0, 4.1, 0), mevPmpe: 0, totalPmpe: 6.2 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 400_000,
    marinadeSamTargetSol: 135_000,
  },
  lastCapConstraint: null,
  stakePriority: 21,
  unstakePriority: 21,
  maxBondDelegation: 350_000,
  bondSamStakeCapSol: 350_000,
  unprotectedStakeCapSol: 12_500,
  unprotectedStakeSol: 10_000,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 24,
  bondSamHealth: 1,
  values: {
    ...makeValues({
      bondBalanceSol: 160,
      marinadeActivatedStakeSol: 125_000,
      mevComm: 0,
    }),
    commissions: {
      ...makeValues({
        bondBalanceSol: 160,
        marinadeActivatedStakeSol: 125_000,
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
    marinadeActivatedStakeSol: 100_000,
    bondBalanceSol: 130,
    claimableBondBalanceSol: 130,
    inflationCommissionDec: 0.1,
    bidCpmpe: 2.2,
    country: 'Singapore',
    aso: ASO_CONTABO,
  }),
  revShare: { ...makeRevShare(2.2, 0, 3.5), totalPmpe: 3.5 + 0.9 + 2.2 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 350_000,
    marinadeSamTargetSol: 110_000,
  },
  lastCapConstraint: null,
  stakePriority: 22,
  unstakePriority: 22,
  maxBondDelegation: 400_000,
  bondSamStakeCapSol: 400_000,
  unprotectedStakeCapSol: 10_000,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 26,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 130,
    marinadeActivatedStakeSol: 100_000,
    inflComm: 0.1,
  }),
}

// 11. Zero bid (bidPmpe = 0, edge case)
const v11: AuctionValidator = {
  ...makeBase('FiXtUREvaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkk', {
    marinadeActivatedStakeSol: 25_000,
    // Healthy bond so the "zero bid" edge state isn't muddied by a bond CTA.
    bondBalanceSol: 50,
    claimableBondBalanceSol: 50,
    bidCpmpe: 0,
    country: C_DE,
    aso: ASO_HETZNER,
  }),
  revShare: { ...makeRevShare(0), bidPmpe: 0, auctionEffectiveBidPmpe: 0 },
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: false,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 250_000, marinadeSamTargetSol: 0 },
  lastCapConstraint: null,
  stakePriority: 0,
  unstakePriority: 0,
  maxBondDelegation: 250_000,
  bondSamStakeCapSol: 250_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 35,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 50,
    marinadeActivatedStakeSol: 25_000,
  }),
}

// 12. Max stake (near TVL cap, very large stake)
const v12: AuctionValidator = {
  ...makeBase('FiXtUREvaZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZll', {
    marinadeActivatedStakeSol: 1_200_000,
    bondBalanceSol: 1_300,
    claimableBondBalanceSol: 1_300,
    bidCpmpe: 3.2,
    totalActivatedStakeSol: 4_000_000,
    country: C_DE,
    aso: ASO_HETZNER,
  }),
  revShare: makeRevShare(3.2, 0, 4.5, 1.1),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 2_000_000,
    marinadeSamTargetSol: 1_200_000,
  },
  // Country concentration cap hit — DE is over the 30% network cap on
  // /test- (this 1.2M target plus v01's 275k = ~38.5%), so the country
  // concentration tile renders "(capped)".
  lastCapConstraint: {
    constraintType: AuctionConstraintType.COUNTRY,
    constraintName: C_DE,
    totalStakeSol: 1_475_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 1_475_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  stakePriority: 32,
  unstakePriority: 32,
  maxBondDelegation: 1_500_000,
  bondSamStakeCapSol: 1_500_000,
  unprotectedStakeCapSol: 50_000,
  unprotectedStakeSol: 80_000,
  minBondPmpe: 0.8,
  idealBondPmpe: 0.4,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 40,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 1_300,
    marinadeActivatedStakeSol: 1_200_000,
  }),
}

// 13. No bond posted at all (bondBalanceSol = 0 → bondHealthFromAuction
//   returns 'no-bond'). Eligible + staked + positive SAM target, so it
//   passes every auction gate. NOTE: the SAM table's passesTableFilter
//   short-circuits on `!v.bondBalanceSol` (sam-table.tsx) and the detail
//   panel's sheetValidatorData filters `selectBondSize > 0`, so a true
//   zero-bond row is structurally filtered out of /test- in both Basic
//   and Expert. This row keeps the no-bond STATE present in the fixture
//   data (every modality covered) even though the current page chrome
//   never renders it — see the task report for the blocker.
const v13: AuctionValidator = {
  ...makeBase('FiXtUREvaNOBONDdddddddddddddddddddddddddddmm', {
    marinadeActivatedStakeSol: 90_000,
    bondBalanceSol: 0,
    claimableBondBalanceSol: 0,
    bidCpmpe: 2.4,
    country: C_US,
    aso: ASO_AWS,
  }),
  revShare: makeRevShare(2.4),
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: {
    externalActivatedSol: 500_000,
    marinadeSamTargetSol: 95_000,
  },
  lastCapConstraint: null,
  stakePriority: 24,
  unstakePriority: 24,
  maxBondDelegation: 300_000,
  bondSamStakeCapSol: 300_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 0,
  bondSamHealth: 0,
  values: makeValues({
    bondBalanceSol: 0,
    marinadeActivatedStakeSol: 90_000,
  }),
}

// ───── CTA / Next-Step state-coverage fixtures ───────────────────────────────
//
// One row per distinct getValidatorTip / bondAdvice / bond-health outcome and
// the combinations a real validator hits, so /test- renders the full CTA
// surface for visual review. The bond-coverage math (config below:
// minBondEpochs=1, idealBondEpochs=13, minBondBalanceSol=5, bondRiskFeeMult=1)
// reduces — with unprotected reserves zeroed — to:
//   stakeKeepFloor      = (minBondPmpe   / 1000) * marinadeActivatedStakeSol
//   stakeIdealFloor  = (idealBondPmpe / 1000) * marinadeActivatedStakeSol
//   bondRiskFeeFloor = (minBondPmpe   / 1000) * (active − paidUndelegationSol)
//   topUpToKeepStake   = max(0, stakeKeepFloor      − claimableBondBalanceSol)
//   topUpToIdealKeep   = max(0, stakeIdealFloor  − bondBalanceSol)
//   bondRiskFeeShortfall    = max(0, bondRiskFeeFloor − claimableBondBalanceSol)
// Health: bond≤0 → no-bond; bond<5 → critical; avoidFee>0 → critical;
// keep>0 → watch; idealKeep>0 → soft; else healthy.
// expectedStakeChangeSol is NOT set here — it is derived globally from the
// greedy redelegation budget (= max(0, TVL − Σ active)). These rows keep a
// modest active base (STATE_ACTIVE) so Σ active stays well under TVL and the
// budget can actually fund the "gaining" rows. Stake direction is then
// steered via marinadeSamTargetSol vs marinadeActivatedStakeSol (and
// paidUndelegationSol): target > active → inflow (gaining); target ≪ active
// → over-target, sheds the pro-rata natural withdrawal (losing); target ==
// active → flat. Every per-mille example in the s-row comments below states
// its floor relative to STATE_ACTIVE = 50_000; the relations are degree-1
// homogeneous so the tier each row lands in is unchanged by the global scale.

const STATE_ACTIVE = 50_000

function stateValidator(
  voteAccount: string,
  opts: {
    minBondPmpe: number
    idealBondPmpe: number
    bondBalanceSol: number
    claimableBondBalanceSol: number
    marinadeSamTargetSol: number
    bondGoodForNEpochs: number
    bidCpmpe?: number
    paidUndelegationSol?: number
    bondRiskFeeSol?: number
    marinadeActivatedStakeSol?: number
    country?: string
    aso?: string
  },
): AuctionValidator {
  const active = opts.marinadeActivatedStakeSol ?? STATE_ACTIVE
  const bid = opts.bidCpmpe ?? 2.5
  return {
    ...makeBase(voteAccount, {
      marinadeActivatedStakeSol: active,
      bondBalanceSol: opts.bondBalanceSol,
      bidCpmpe: bid,
      country: opts.country,
      aso: opts.aso,
    }),
    claimableBondBalanceSol: opts.claimableBondBalanceSol,
    revShare: makeRevShare(bid),
    bidTooLowPenalty: { coef: 0, base: 0 },
    bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
    // Eligible even when below the line — a validator can pass every gate
    // and still lose the auction on price/bond. Eligibility is NOT winning.
    samEligible: true,
    backstopEligible: false,
    samBlocked: false,
    auctionStake: {
      externalActivatedSol: 750_000,
      marinadeSamTargetSol: opts.marinadeSamTargetSol,
    },
    lastCapConstraint: null,
    stakePriority: Math.round(bid * 10),
    unstakePriority: Math.round(bid * 10),
    maxBondDelegation: 1_000_000,
    bondSamStakeCapSol: 1_000_000,
    unprotectedStakeCapSol: 0,
    unprotectedStakeSol: 0,
    minBondPmpe: opts.minBondPmpe,
    idealBondPmpe: opts.idealBondPmpe,
    minUnprotectedReserve: 0,
    idealUnprotectedReserve: 0,
    bondGoodForNEpochs: opts.bondGoodForNEpochs,
    bondSamHealth: 1,
    values: {
      ...makeValues({
        bondBalanceSol: opts.bondBalanceSol,
        marinadeActivatedStakeSol: active,
      }),
      paidUndelegationSol: opts.paidUndelegationSol ?? 0,
      bondRiskFeeSol: opts.bondRiskFeeSol ?? 0,
    },
  }
}

// 13. Healthy bond + gaining stake (positive / none, up arrow).
//   ideal floor = (2/1000)*50000 = 100; bond 150 ≥ 100 → healthy.
//   target 70k > active 50k → +20k inflow next epoch.
const s13 = stateValidator('FiXtUREvbHEALTHYgaining1111111111111111111aa', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 150,
  claimableBondBalanceSol: 150,
  marinadeSamTargetSol: 70_000,
  bondGoodForNEpochs: 60,
  bidCpmpe: 3.4,
  country: 'Finland',
  aso: ASO_GCP,
})

// 14. Healthy bond + losing stake (warning / none, down arrow).
//   target 10k ≪ active 50k → big over-target excess; absorbs most of the
//   pro-rata natural withdrawal → clearly negative Δ next epoch.
const s14 = stateValidator('FiXtUREvbHEALTHYlosing22222222222222222222bb', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 150,
  claimableBondBalanceSol: 150,
  marinadeSamTargetSol: 10_000,
  bondGoodForNEpochs: 55,
  bidCpmpe: 3.3,
  country: C_GB,
  aso: ASO_CHERRY,
})

// 15. Healthy bond + at target (neutral / none, → arrow, "At target stake.").
//   target == active, no excess → no withdrawal, no inflow → Δ = 0.
const s15 = stateValidator('FiXtUREvbHEALTHYattarget3333333333333333cc', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 150,
  claimableBondBalanceSol: 150,
  marinadeSamTargetSol: STATE_ACTIVE,
  bondGoodForNEpochs: 50,
  bidCpmpe: 3.2,
  country: 'Australia',
  aso: ASO_CONTABO,
})

// 16. Soft bond + losing stake (info / bond, "Top up N to grow stake.").
//   ideal floor = (10/1000)*50000 = 500; bond 200 < 500 → idealKeep=300 → soft.
//   keep floor = (1/1000)*50000 = 50 ≤ claimable 200 → not watch. Δ≤0 so the
//   soft branch holds (not overridden by a positive delta).
const s16 = stateValidator('FiXtUREvbSOFTlosing44444444444444444444444dd', {
  minBondPmpe: 1,
  idealBondPmpe: 10,
  bondBalanceSol: 200,
  claimableBondBalanceSol: 200,
  marinadeSamTargetSol: 15_000,
  bondGoodForNEpochs: 28,
  bidCpmpe: 3.0,
  country: 'Japan',
  aso: ASO_EQUINIX,
})

// 17. Soft bond + gaining stake — the precedence rule: the advisory
//   "grow stake" top-up DEFERS to the positive "arriving" message
//   (positive / none). Same soft shape as 16 but target ≫ active.
const s17 = stateValidator('FiXtUREvbSOFTgaining55555555555555555555555ee', {
  minBondPmpe: 1,
  idealBondPmpe: 10,
  bondBalanceSol: 200,
  claimableBondBalanceSol: 200,
  marinadeSamTargetSol: 150_000,
  bondGoodForNEpochs: 26,
  bidCpmpe: 3.1,
  country: C_FR,
  aso: ASO_OVH,
})

// 18. Watch bond + losing stake (warning / bond, "Top up N to keep your
//   stake."). minBondPmpe 2 → keep floor = (2/1000)*50000 = 100. paid 32.5k
//   shrinks projected exposed to 17.5k → floorProj = (2/1000)*17500 = 35 ≤
//   claimable 40 → fee=0; keep = 100 − 40 = 60 > 0 → watch. The paid
//   undelegation also drives Δ < 0.
const s18 = stateValidator('FiXtUREvbWATCHlosing66666666666666666666666ff', {
  minBondPmpe: 2,
  idealBondPmpe: 0.1,
  bondBalanceSol: 40,
  claimableBondBalanceSol: 40,
  marinadeSamTargetSol: 30_000,
  bondGoodForNEpochs: 12,
  paidUndelegationSol: 32_500,
  bidCpmpe: 2.7,
  country: C_NL,
  aso: ASO_LATITUDE,
})

// 19. Watch bond + gaining stake — keep-stake CTA stays (truthful while
//   gaining: the inflow does not refill the bond). Same watch shape as 18
//   but target ≫ active so the inflow outweighs the 32.5k paid undelegation
//   → net positive Δ, yet the bond CTA still wins by priority.
const s19 = stateValidator('FiXtUREvbWATCHgaining77777777777777777777gg', {
  minBondPmpe: 2,
  idealBondPmpe: 0.1,
  bondBalanceSol: 40,
  claimableBondBalanceSol: 40,
  marinadeSamTargetSol: 200_000,
  bondGoodForNEpochs: 11,
  paidUndelegationSol: 32_500,
  bidCpmpe: 3.5,
  country: C_NL,
  aso: ASO_TERASWITCH,
})

// 20. Critical bond via avoid-fee (critical / bond, "Top up N to avoid the
//   bond risk fee."). minBondPmpe 2, paid 0 → projected floor =
//   (2/1000)*50000 = 100; claimable 20 → fee = 80 > 0 → critical.
const s20 = stateValidator('FiXtUREvbCRITICALfee8888888888888888888888hh', {
  minBondPmpe: 2,
  idealBondPmpe: 4,
  bondBalanceSol: 40,
  claimableBondBalanceSol: 20,
  marinadeSamTargetSol: 45_000,
  bondGoodForNEpochs: 4,
  bidCpmpe: 2.9,
  country: 'Singapore',
  aso: ASO_VULTR,
})

// 21. Below-minimum bond, IN-SET (critical / bond, "Top up bond to 5 SOL to
//   win stake."). bond 2 < minBondBalanceSol 5 → hard block; the sub-min
//   force-removal makes the stake column show losing ALL active stake —
//   the "critical bond + losing all stake" real combination. The 2 SOL bond
//   is an ABSOLUTE threshold vs the unscaled config minBondBalanceSol=5,
//   not a stake-relative floor, so it is deliberately NOT scaled.
const s21 = stateValidator('FiXtUREvbBELOWMINinset9999999999999999999ii', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 2,
  claimableBondBalanceSol: 2,
  marinadeSamTargetSol: 200_000,
  bondGoodForNEpochs: 2,
  bidCpmpe: 2.6,
  country: C_GB,
  aso: ASO_CHERRY,
})

// 22. Below-minimum bond, OUT-OF-SET (critical / bond, "Top up bond to 5 SOL
//   to grow stake."). target 0, bond 2 < 5, still has active stake so it
//   survives the Basic table filter. Bond left at 2 (absolute below-min
//   threshold, not stake-relative — same rationale as s21).
const s22 = stateValidator('FiXtUREvbBELOWMINoutaaaaaaaaaaaaaaaaaaaaajj', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 2,
  claimableBondBalanceSol: 2,
  marinadeSamTargetSol: 0,
  bondGoodForNEpochs: 3,
  bidCpmpe: 0.6,
  country: C_FR,
  aso: ASO_OVH,
})

// 23. Out-of-set, HEALTHY bond, bid too low (warning / rank). The pill
//   renders the muted two-word "Bid too low" block; full sentence is in
//   the detail panel. Healthy bond so no bond CTA shadows the rank one.
const s23 = stateValidator('FiXtUREvbOUTbidlowbbbbbbbbbbbbbbbbbbbbbbbbkk', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 750,
  claimableBondBalanceSol: 750,
  marinadeSamTargetSol: 0,
  bondGoodForNEpochs: 45,
  bidCpmpe: 0.5,
  country: C_GB,
  aso: ASO_CHERRY,
})

// 24. Out-of-set, SOFT bond, top-up to grow (warning / bond, "Top up N to
//   grow stake."). ideal floor = (10/1000)*50000 = 500; bond 200 < 500 →
//   soft. Out-of-set + unhealthy bond → bond CTA, not the rank CTA.
const s24 = stateValidator('FiXtUREvbOUTsoftgrowccccccccccccccccccccccll', {
  minBondPmpe: 1,
  idealBondPmpe: 10,
  bondBalanceSol: 200,
  claimableBondBalanceSol: 200,
  marinadeSamTargetSol: 0,
  bondGoodForNEpochs: 22,
  bidCpmpe: 0.7,
  country: C_NL,
  aso: ASO_TERASWITCH,
})

// 25. CRITICAL: fee estimated AND shortfall (bond can't cover fee in full).
//   minBondPmpe=2, active=50k → bondRiskFeeFloor=100; claimable=20 → shortfall=80.
//   bondRiskFeeSol=15 (scoring API estimate) > 0 → both fee and shortfall fire.
//   CTA: "Top up 80 or pay 15 bond fee." (topUp + pay variant).
const s25 = stateValidator('FiXtUREvbCRITICALfeeAndShort25555555555555mm', {
  minBondPmpe: 2,
  idealBondPmpe: 4,
  bondBalanceSol: 40,
  claimableBondBalanceSol: 20,
  marinadeSamTargetSol: 45_000,
  bondGoodForNEpochs: 4,
  bidCpmpe: 2.9,
  bondRiskFeeSol: 15,
  country: 'Germany',
  aso: ASO_AWS,
})

// 26. CRITICAL: runway only — no fee, no shortfall, no keep/ideal shortfall.
//   minBondPmpe=1, idealBondPmpe=2, active=50k → minFloor=50, idealFloor=100.
//   claimable=200 ≥ 50 → topUpToKeepStake=0; bond=200 ≥ 100 → topUpToIdealKeep=0.
//   bondGoodForNEpochs=4 (≤ minBond+URGENT=4) → CRITICAL from runway.
//   CTA: "Top up bond to extend runway." (generic fallback).
const s26 = stateValidator('FiXtUREvbCRITICALrunwayOnly26666666666666nn', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 200,
  claimableBondBalanceSol: 200,
  marinadeSamTargetSol: 45_000,
  bondGoodForNEpochs: 4,
  bidCpmpe: 2.8,
  country: C_NL,
  aso: ASO_LATITUDE,
})

// 27. Below-min bond + fee charging → CRITICAL/red "Top up bond to 5 to grow stake."
//   bond=3 < minBondBalanceSol=5; bondRiskFeeSol=10 → isCharging=true → red/critical.
//   NOTE: passesTableFilter removes bond < minBondBalanceSol — this validator is
//   invisible in the Basic table but reachable via detail-panel search.
const s27 = stateValidator('FiXtUREvbBELOWMINfee27777777777777777777oo', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 3,
  claimableBondBalanceSol: 3,
  marinadeSamTargetSol: 30_000,
  bondGoodForNEpochs: 2,
  bidCpmpe: 2.7,
  bondRiskFeeSol: 10,
  country: C_US,
  aso: ASO_EQUINIX,
})

// 28. In-set + delta=0 + cap binding → capCta: "X — stake can't grow until cap frees."
//   marinadeSamTargetSol=STATE_ACTIVE → target=active → no undelegation, no inflow → delta=0.
//   lastCapConstraint with totalLeftToCapSol=0 → cap is full.
//   Bond healthy so no bond CTA shadows capCta.
const s28: AuctionValidator = {
  ...stateValidator('FiXtUREvbCAPinset28888888888888888888888888pp', {
    minBondPmpe: 1,
    idealBondPmpe: 2,
    bondBalanceSol: 200,
    claimableBondBalanceSol: 200,
    marinadeSamTargetSol: STATE_ACTIVE,
    bondGoodForNEpochs: 30,
    bidCpmpe: 2.5,
    country: C_GB,
    aso: ASO_CHERRY,
  }),
  lastCapConstraint: {
    constraintType: AuctionConstraintType.ASO,
    constraintName: ASO_GCP,
    totalStakeSol: 1_000_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 500_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
}

// 29. In-set + delta=0 + below target + below priority frontier →
//   deltaCta: "Raise bid to grow stake."
//   bid=1.01 → totalPmpe=6.01 (> WINNING_PMPE=6.0 → in-set, marinadeSamTargetSol>0).
//   active=5k, target=80k → belowTarget=true.
//   stakePriority=10 (lowest) → greedy pass exhausts budget on higher-bid validators first.
//   totalPmpe(6.01) < priorityFrontierPmpe (~7.5) → bid lever fires.
const s29 = stateValidator('FiXtUREvbRAISEbid29999999999999999999999999qq', {
  minBondPmpe: 1,
  idealBondPmpe: 2,
  bondBalanceSol: 100,
  claimableBondBalanceSol: 100,
  marinadeSamTargetSol: 80_000,
  bondGoodForNEpochs: 30,
  bidCpmpe: 1.01,
  marinadeActivatedStakeSol: 5_000,
  country: C_NL,
  aso: ASO_TERASWITCH,
})

// ───── outOfSetCta coverage fixtures (o-row) ─────────────────────────────────
//
// One validator per branch of outOfSetCta in src/services/tip-engine.ts so
// /test- renders every CTA-text variant. Every o-row is out-of-set
// (marinadeSamTargetSol=0) with totalPmpe (7.5) > WINNING_PMPE (6.0) so
// outOfSetCta fires instead of bidCta's "Bid too low" rank branch. Severity
// branches on marinadeActivatedStakeSol > 10_000 (NON_TRIVIAL_STAKE_SOL).
//
// NOTE: rows with bondBalanceSol=null (o02, o09) are structurally filtered
// out of the SAM table (passesTableFilter short-circuits on !bondBalanceSol),
// but kept here for completeness of CTA-branch coverage — they surface in
// any future surface that doesn't apply that filter, and the data shape
// covers the "no bond posted" eligibility branch.

function outOfSetBase(
  voteAccount: string,
  opts: {
    marinadeActivatedStakeSol: number
    bondBalanceSol?: number | null
    maxStakeWanted?: number | null
    country?: string
    aso?: string
  },
): Omit<
  AuctionValidator,
  | 'samEligible'
  | 'samBlocked'
  | 'lastCapConstraint'
  | 'revShare'
  | 'bidTooLowPenalty'
  | 'bondForcedUndelegation'
  | 'auctionStake'
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
  | 'backstopEligible'
  | 'values'
> {
  // bondBalanceSol may be null — override the numeric default in makeBase.
  const baseBond = opts.bondBalanceSol ?? 100
  const base = makeBase(voteAccount, {
    marinadeActivatedStakeSol: opts.marinadeActivatedStakeSol,
    bondBalanceSol: baseBond,
    claimableBondBalanceSol: baseBond,
    bidCpmpe: 2.5, // → totalPmpe 7.5 > winning 6.0
    maxStakeWanted: opts.maxStakeWanted,
    country: opts.country,
    aso: opts.aso,
  })
  return {
    ...base,
    bondBalanceSol:
      opts.bondBalanceSol === undefined ? baseBond : opts.bondBalanceSol,
    lastBondBalanceSol:
      opts.bondBalanceSol === undefined ? baseBond : opts.bondBalanceSol,
  }
}

function outOfSetValues(active: number, bondBalance: number | null) {
  return makeValues({
    bondBalanceSol: bondBalance ?? 0,
    marinadeActivatedStakeSol: active,
  })
}

const O_COMMON = {
  bidTooLowPenalty: { coef: 0, base: 0 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  backstopEligible: false,
  auctionStake: { externalActivatedSol: 500_000, marinadeSamTargetSol: 0 },
  stakePriority: 25,
  unstakePriority: 25,
  maxBondDelegation: 250_000,
  bondSamStakeCapSol: 250_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 20,
  bondSamHealth: 1,
  revShare: makeRevShare(2.5),
} as const

// o01. samBlocked, high stake → CRITICAL "Blocked from SAM this epoch."
const o01: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoSAMBLOCKEDhi1111111111111111111111aa', {
    marinadeActivatedStakeSol: 80_000,
    country: C_US,
    aso: ASO_AWS,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: true,
  lastCapConstraint: null,
  values: outOfSetValues(80_000, 100),
}

// o02. samEligible=false + bondBalanceSol=null → CRITICAL "No bond posted."
const o02: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoNOBONDhi2222222222222222222222222bb', {
    marinadeActivatedStakeSol: 70_000,
    bondBalanceSol: null,
    country: C_FR,
    aso: ASO_OVH,
  }),
  ...O_COMMON,
  samEligible: false,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(70_000, null),
}

// o03. Blacklisted (voteAccount added to blacklist set), high stake →
//   CRITICAL "Blacklisted by Marinade."
const O03_VOTE = 'FiXtUREvoBLACKLISTEDhi33333333333333333333cc'
const o03: AuctionValidator = {
  ...outOfSetBase(O03_VOTE, {
    marinadeActivatedStakeSol: 60_000,
    country: C_GB,
    aso: ASO_CHERRY,
  }),
  ...O_COMMON,
  samEligible: false,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(60_000, 100),
}

// o13. Blacklisted + no penalty + not defending (low stake ≤ NON_TRIVIAL_STAKE_SOL) →
//   NEUTRAL "Blacklisted by Marinade." — no stake at real risk, informational.
const O13_VOTE = 'FiXtUREvoBLACKLISTEDlo13999999999999999999mm'
const o13: AuctionValidator = {
  ...outOfSetBase(O13_VOTE, {
    marinadeActivatedStakeSol: 5_000,
    country: C_FR,
    aso: ASO_OVH,
  }),
  ...O_COMMON,
  samEligible: false,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(5_000, 100),
}

// o04. samEligible=false, bond present, not blacklisted → CRITICAL
//   "Not eligible — check client version and vote credits."
const o04: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoCLIENThi4444444444444444444444444dd', {
    marinadeActivatedStakeSol: 55_000,
    country: 'Japan',
    aso: ASO_EQUINIX,
  }),
  ...O_COMMON,
  samEligible: false,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(55_000, 100),
}

// o05. Cap COUNTRY, high stake → WARNING "{country} at country cap — out of set."
const o05: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoCAPCOUNTRYhi555555555555555555555ee', {
    marinadeActivatedStakeSol: 65_000,
    country: 'Czechia',
    aso: ASO_LATITUDE,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: {
    constraintType: AuctionConstraintType.COUNTRY,
    constraintName: 'Czechia',
    totalStakeSol: 500_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 500_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  values: outOfSetValues(65_000, 100),
}

// o06. Cap ASO, high stake → WARNING "{aso} at ASO cap — out of set."
const o06: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoCAPASOhi6666666666666666666666666ff', {
    marinadeActivatedStakeSol: 75_000,
    country: C_NL,
    aso: ASO_OVH,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: {
    constraintType: AuctionConstraintType.ASO,
    constraintName: ASO_OVH,
    totalStakeSol: 600_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 600_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  values: outOfSetValues(75_000, 100),
}

// o07. Generic out-of-set — eligible, no cap, not blocked, bid clears.
//   No specific constraint detected → falls to deltaCta: "Losing X SOL next epoch."
const o07: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoGENERIChi7777777777777777777777777gg', {
    marinadeActivatedStakeSol: 45_000,
    country: 'Australia',
    aso: ASO_CONTABO,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(45_000, 100),
}

// o07b. Same generic fallthrough path as o07 but large active stake → WARNING
//   (yellow) "Losing X SOL next epoch." (isDefending fires at > 10k active + > 1k delta).
const o07b: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoGENERIChi7bbbbbbbbbbbbbbbbbbbbbbbgg', {
    marinadeActivatedStakeSol: 120_000,
    country: C_US,
    aso: ASO_AWS,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(120_000, 100),
}

// o08. samBlocked + low stake (≤10k) → NEUTRAL/grey tone.
const o08: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoSAMBLOCKEDlo888888888888888888888hh', {
    marinadeActivatedStakeSol: 0,
    country: C_DE,
    aso: ASO_HETZNER,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: true,
  lastCapConstraint: null,
  values: outOfSetValues(0, 100),
}

// o09. No bond + low stake (≤10k) → NEUTRAL/grey tone, BOND lever icon.
const o09: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoNOBONDlo999999999999999999999999ii', {
    marinadeActivatedStakeSol: 0,
    bondBalanceSol: null,
    country: C_US,
    aso: ASO_VULTR,
  }),
  ...O_COMMON,
  samEligible: false,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(0, null),
}

// o10. maxStakeWanted=0 → INFO "Max-stake-wanted set to 0 — opted out."
//   (Severity locked to INFO regardless of stake.)
const o10: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoOPTEDOUTaaaaaaaaaaaaaaaaaaaaaaaajj', {
    marinadeActivatedStakeSol: 40_000,
    maxStakeWanted: 0,
    country: C_FR,
    aso: ASO_OVH,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: null,
  values: outOfSetValues(40_000, 100),
}

// o11. Cap VALIDATOR (constraintName is the vote account, omitted in copy).
//   Mid-stake → WARNING tone via outOfSetCta cap branch.
const o11: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoCAPVALIDATORbbbbbbbbbbbbbbbbbbbbbkk', {
    marinadeActivatedStakeSol: 50_000,
    country: C_GB,
    aso: ASO_TERASWITCH,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: {
    constraintType: AuctionConstraintType.VALIDATOR,
    constraintName: 'FiXtUREvoCAPVALIDATORbbbbbbbbbbbbbbbbbbbbbkk',
    totalStakeSol: 200_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 200_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  values: outOfSetValues(50_000, 100),
}

// o12. Cap WANT (validator's own stake-wanted cap reached but not opted out).
//   Mid-stake → WARNING tone.
const o12: AuctionValidator = {
  ...outOfSetBase('FiXtUREvoCAPWANTccccccccccccccccccccccccccll', {
    marinadeActivatedStakeSol: 50_000,
    maxStakeWanted: 50_000,
    country: 'Finland',
    aso: ASO_GCP,
  }),
  ...O_COMMON,
  samEligible: true,
  samBlocked: false,
  lastCapConstraint: {
    constraintType: AuctionConstraintType.WANT,
    constraintName: '',
    totalStakeSol: 50_000,
    totalLeftToCapSol: 0,
    marinadeStakeSol: 50_000,
    marinadeLeftToCapSol: 0,
    validators: [],
  },
  values: outOfSetValues(50_000, 100),
}

// ───── Out-of-set + bid-too-low penalty (p-row) ──────────────────────────────
//
// Validators that dropped their bid hard: now both below the winning line
// (out-of-set) AND paying a bid-too-low penalty. bidCta fires CRITICAL/BID
// ("Raise bid or pay penalty") which outranks the rank WARNING.

// p01. Out-of-set + penalty + healthy bond → CRITICAL/BID.
//   Dropped from 2.5 to 0.5 (bidPmpe < lastEpochBid) → penalty active.
//   totalPmpe = 5.5 < WINNING_PMPE 6.0 → below line → out of set.
//   Bond 200 well above min (5) → bond CTA does not shadow penalty.
const p01: AuctionValidator = {
  ...makeBase('FiXtURevpPENALTYouthealthy1111111111111111aa', {
    marinadeActivatedStakeSol: 55_000,
    bondBalanceSol: 200,
    claimableBondBalanceSol: 200,
    bidCpmpe: 0.5, // totalPmpe = 4.1+0.9+0.5 = 5.5 < 6.0
    country: C_US,
    aso: ASO_AWS,
  }),
  // History: bid was 2.5 for two epochs, dropped to 0.5 → bidTooLowPenalty fires.
  auctions: makeAuctions(2.5, WINNING_PMPE).map((a, i) => ({
    ...a,
    bidPmpe: i < 2 ? 2.5 : 0.5,
    auctionEffectiveBidPmpe: i < 2 ? 2.5 : 0.5,
    effParticipatingBidPmpe: i < 2 ? 2.5 : 0.5,
  })),
  revShare: { ...makeRevShare(0.5, 0.6), auctionEffectiveBidPmpe: 0.5 },
  bidTooLowPenalty: { coef: 0.3, base: 0.5 },
  bondForcedUndelegation: { coef: 0, base: 0, value: 0 },
  samEligible: true,
  backstopEligible: false,
  samBlocked: false,
  auctionStake: { externalActivatedSol: 600_000, marinadeSamTargetSol: 0 },
  lastCapConstraint: null,
  stakePriority: 5,
  unstakePriority: 5,
  maxBondDelegation: 300_000,
  bondSamStakeCapSol: 300_000,
  unprotectedStakeCapSol: 0,
  unprotectedStakeSol: 0,
  minBondPmpe: 1.0,
  idealBondPmpe: 0.5,
  minUnprotectedReserve: 0,
  idealUnprotectedReserve: 0,
  bondGoodForNEpochs: 30,
  bondSamHealth: 1,
  values: makeValues({
    bondBalanceSol: 200,
    marinadeActivatedStakeSol: 55_000,
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
  v13,
  s13,
  s14,
  s15,
  s16,
  s17,
  s18,
  s19,
  s20,
  s21,
  s22,
  s23,
  s24,
  s25,
  s26,
  s27,
  s28,
  s29,
  o01,
  o02,
  o03,
  o13,
  o04,
  o05,
  o06,
  o07,
  o07b,
  o08,
  o09,
  o10,
  o11,
  o12,
  p01,
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
      networkTotalSol: 2_000_000_000,
      marinadeSamTvlSol: TVL,
      marinadeRemainingSamSol: 300_000,
    },
    blacklist: new Set<string>([O03_VOTE, O13_VOTE]),
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
  // 5 SOL (not the network's 0.1) so the below-minimum bond CTA renders a
  // readable "Top up bond to 5 SOL to win stake." All baseline fixture
  // bonds are ≥ 6 SOL, so their health/coverage is unaffected.
  minBondBalanceSol: 5,
  minBondEpochs: 1,
  // Bond runway gauge scaleMax = 4 × idealBondEpochs = 52ep, so a healthy
  // 40-60ep runway fills realistically instead of saturating at the old
  // ceiling of 12 (4 × 3). minBondEpochs stays 1 (the SDK floor) — raising
  // it would push s21 (bondGoodForNEpochs=2) and the low-runway critical
  // s-rows below the Basic table's runway filter and drop their CTAs.
  idealBondEpochs: 13,
  bondRiskFeeMult: 1.0,
  activatingStakePmpeMult: 1,
  bondSamHealthMult: 1.1,
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
  ['FiXtUREvaNOBONDdddddddddddddddddddddddddddmm', 'Test: No Bond Posted'],
  ['FiXtUREvbHEALTHYgaining1111111111111111111aa', 'CTA: Healthy + Gaining'],
  ['FiXtUREvbHEALTHYlosing22222222222222222222bb', 'CTA: Healthy + Losing'],
  ['FiXtUREvbHEALTHYattarget3333333333333333cc', 'CTA: Healthy + At-Target'],
  ['FiXtUREvbSOFTlosing44444444444444444444444dd', 'CTA: Soft Bond + Losing'],
  [
    'FiXtUREvbSOFTgaining55555555555555555555555ee',
    'CTA: Soft Bond + Gaining (defer)',
  ],
  ['FiXtUREvbWATCHlosing66666666666666666666666ff', 'CTA: Watch Bond + Losing'],
  ['FiXtUREvbWATCHgaining77777777777777777777gg', 'CTA: Watch Bond + Gaining'],
  ['FiXtUREvbCRITICALfee8888888888888888888888hh', 'CTA: Critical (Risk Fee)'],
  [
    'FiXtUREvbBELOWMINinset9999999999999999999ii',
    'CTA: Below-Min Bond (In-Set)',
  ],
  [
    'FiXtUREvbBELOWMINoutaaaaaaaaaaaaaaaaaaaaajj',
    'CTA: Below-Min Bond (Out-of-Set)',
  ],
  [
    'FiXtUREvbOUTbidlowbbbbbbbbbbbbbbbbbbbbbbbbkk',
    'CTA: Out-of-Set Bid Too Low',
  ],
  ['FiXtUREvbOUTsoftgrowccccccccccccccccccccccll', 'CTA: Out-of-Set Soft Grow'],
  [
    'FiXtUREvbCRITICALfeeAndShort25555555555555mm',
    'CTA: Critical (Fee + Shortfall)',
  ],
  [
    'FiXtUREvbCRITICALrunwayOnly26666666666666nn',
    'CTA: Critical (Runway Fallback)',
  ],
  [
    'FiXtUREvbBELOWMINfee27777777777777777777oo',
    'CTA: Below-Min Bond + Fee',
  ],
  [
    'FiXtUREvbCAPinset28888888888888888888888888pp',
    'CTA: In-Set Cap (no growth)',
  ],
  [
    'FiXtUREvbRAISEbid29999999999999999999999999qq',
    'CTA: Raise Bid to Grow Stake',
  ],
  [
    'FiXtUREvoSAMBLOCKEDhi1111111111111111111111aa',
    'Test: samBlocked (real stake)',
  ],
  [
    'FiXtUREvoNOBONDhi2222222222222222222222222bb',
    'Test: No bond (real stake)',
  ],
  [
    'FiXtUREvoBLACKLISTEDhi33333333333333333333cc',
    'Test: Blacklisted (real stake)',
  ],
  [
    'FiXtUREvoBLACKLISTEDlo13999999999999999999mm',
    'Test: Blacklisted (no stake)',
  ],
  [
    'FiXtUREvoCLIENThi4444444444444444444444444dd',
    'Test: Client/credits (real stake)',
  ],
  [
    'FiXtUREvoCAPCOUNTRYhi555555555555555555555ee',
    'Test: Cap COUNTRY (real stake)',
  ],
  [
    'FiXtUREvoCAPASOhi6666666666666666666666666ff',
    'Test: Cap ASO (real stake)',
  ],
  ['FiXtUREvoGENERIChi7777777777777777777777777gg', 'Test: Generic out-of-set'],
  [
    'FiXtUREvoGENERIChi7bbbbbbbbbbbbbbbbbbbbbbbgg',
    'Test: Generic out-of-set (large)',
  ],
  [
    'FiXtUREvoSAMBLOCKEDlo888888888888888888888hh',
    'Test: samBlocked (no stake)',
  ],
  ['FiXtUREvoNOBONDlo999999999999999999999999ii', 'Test: No bond (no stake)'],
  ['FiXtUREvoOPTEDOUTaaaaaaaaaaaaaaaaaaaaaaaajj', 'Test: Opted out'],
  ['FiXtUREvoCAPVALIDATORbbbbbbbbbbbbbbbbbbbbbkk', 'Test: Cap VALIDATOR'],
  ['FiXtUREvoCAPWANTccccccccccccccccccccccccccll', 'Test: Cap WANT'],
  [
    'FiXtURevpPENALTYouthealthy1111111111111111aa',
    'Test: Out-of-Set + Penalty',
  ],
])

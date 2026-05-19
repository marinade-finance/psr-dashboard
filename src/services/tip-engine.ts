import { AuctionConstraintType } from '@marinade.finance/ds-sam-sdk'

import { ICON_ALERT } from 'src/components/icons/icon-alert'
import { ICON_BID } from 'src/components/icons/icon-bid'
import { ICON_BOND } from 'src/components/icons/icon-bond'
import { ICON_CAP } from 'src/components/icons/icon-cap'
import { ICON_DOWN } from 'src/components/icons/icon-down'
import { ICON_RIGHT } from 'src/components/icons/icon-right'
import { ICON_UP } from 'src/components/icons/icon-up'
import {
  CSS_DESTRUCTIVE,
  CSS_DESTRUCTIVE_LIGHT,
  CSS_INFO,
  CSS_INFO_LIGHT,
  CSS_MUTED,
  CSS_MUTED_FG,
  CSS_PRIMARY,
  CSS_PRIMARY_LIGHT_10,
  CSS_STATUS_YELLOW,
  CSS_STATUS_YELLOW_LIGHT,
  CSS_WARNING,
  CSS_WARNING_LIGHT,
} from 'src/css'
import { pay, stake, topUp } from 'src/format'
import { assertNever } from 'src/utils/assert-never'

import { computeBidPenalty } from './bid-penalty'
import { computeBondCoverage } from './bond-coverage'
import { BondHealthState, bondHealthFromAuction } from './bond-health'
import { apyBreakdown } from './calculations'
import { selectInSet } from './sam'

import type { BondCoverage } from './bond-coverage'
import type { AugmentedAuctionValidator } from './sam'
import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type React from 'react'

export const TipUrgency = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
} as const
export type TipUrgency = (typeof TipUrgency)[keyof typeof TipUrgency]

export const TipConstraint = {
  RANK: 'rank',
  BOND: 'bond',
  BID: 'bid',
  CAP: 'cap',
  NONE: 'none',
} as const
export type TipConstraint = (typeof TipConstraint)[keyof typeof TipConstraint]

export interface ValidatorTip {
  text: string
  urgency: TipUrgency
  constraint: TipConstraint
  // True only for the single most-severe state: an estimated bond risk fee
  // this epoch. Drives the alert glyph (and pulse) — never set for plain
  // below-min / no-bond, which stay critical-red without the escalation.
  alert?: boolean
  // Signed next-epoch stake delta. Only meaningful when constraint === 'none';
  // that's the sole case whose glyph is allowed to be directional.
  delta: number
}

export interface TipStyle {
  color: string
  bg: string
}

// Single severity source for bond advice. The header bond tip and the Bond
// tab status banner must agree on tone; the banner colours off bond-health
// (red/yellow/green axis via card.tsx STATUS_CLASSES), so the header does
// too — never off tip.urgency, whose `info` indigo for soft bond is exactly
// the conflicting second colour c4fe245a removed the duplicate to avoid.
export const getBondAdviceStyle = (health: BondHealthState): TipStyle => {
  switch (health) {
    case BondHealthState.NO_BOND:
    case BondHealthState.CRITICAL:
      return { color: CSS_DESTRUCTIVE, bg: CSS_DESTRUCTIVE_LIGHT }
    case BondHealthState.WATCH:
    case BondHealthState.SOFT:
      return { color: CSS_STATUS_YELLOW, bg: CSS_STATUS_YELLOW_LIGHT }
    case BondHealthState.HEALTHY:
      return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10 }
    default:
      return assertNever(health)
  }
}

// Color carries severity. Glyph carries the lever — except a critical
// alarm also swaps to the alert glyph; see getTipIcon.
export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case TipUrgency.CRITICAL:
      return { color: CSS_DESTRUCTIVE, bg: CSS_DESTRUCTIVE_LIGHT }
    case TipUrgency.WARNING:
      return { color: CSS_WARNING, bg: CSS_WARNING_LIGHT }
    case TipUrgency.INFO:
      return { color: CSS_INFO, bg: CSS_INFO_LIGHT }
    case TipUrgency.POSITIVE:
      return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10 }
    case TipUrgency.NEUTRAL:
      return { color: CSS_MUTED_FG, bg: CSS_MUTED }
    default:
      return assertNever(urgency)
  }
}

// Glyph carries the tip's MEANING (which lever to pull). One exception:
// the single most-severe state — an estimated bond risk fee this epoch
// (tip.alert) — shows the alert glyph so the danger reads at a glance.
// Plain below-min / no-bond stay critical-red but keep their constraint
// glyph (no escalation). Otherwise a constraint maps to one fixed
// non-directional glyph; only constraint:'none' (in-set, the only lever
// left is the stake trajectory) gets a directional arrow, keyed off the
// real signed delta so it can never lie.
export const getTipIcon = (tip: ValidatorTip): React.ReactNode => {
  if (tip.alert) return ICON_ALERT
  switch (tip.constraint) {
    case TipConstraint.BOND:
      return ICON_BOND
    // 'bid' and 'rank' share the same lever (raise the bid) → same glyph.
    // Visual-language rule: glyph = the lever, never an axis duplicate.
    case TipConstraint.BID:
    case TipConstraint.RANK:
      return ICON_BID
    case TipConstraint.CAP:
      return ICON_CAP
    case TipConstraint.NONE:
      if (tip.delta > 0) return ICON_UP
      if (tip.delta < 0) return ICON_DOWN
      return ICON_RIGHT
    default:
      return assertNever(tip.constraint)
  }
}

// SINGLE canonical source for every bond-state CTA string. The sam-table
// Next Step pill, the validator-detail header tip and the Bond breakdown
// status banner all surface THIS text byte-for-byte for a given state —
// never an independent re-wording. Each line is one short clause, sentence
// case, no parentheses, and carries the decisive value (the SOL top-up /
// minimum, or the fee figure when no top-up applies). `tone` is the
// red/yellow/green severity axis the breakdown banner uses; `urgency` is
// the tip-pill axis. They agree by construction.
export type BondAdvice = {
  text: string
  urgency: TipUrgency
  tone: 'red' | 'yellow' | 'green' | 'grey'
}

export function bondAdvice(
  coverage: BondCoverage,
  health: BondHealthState,
  bondRiskFeeSol: number,
  minBondBalanceSol: number,
  bondBalanceSol: number,
): BondAdvice {
  // Below the SDK minimum (independent of health tier): clipBondStakeCap
  // → 0, a hard block. Tell the validator what to do — top up to the
  // minimum. Checked before the health switch so a below-min bond in any
  // tier (typically no-bond/critical) gets the actionable wording.
  if (
    bondBalanceSol < minBondBalanceSol &&
    health !== BondHealthState.NO_BOND
  ) {
    // Below-min without a pending fee is eligibility, not urgency — grey.
    const isCharging = bondRiskFeeSol > 0
    return {
      text: `Top up bond to ${stake(minBondBalanceSol)} to qualify.`,
      urgency: isCharging ? TipUrgency.CRITICAL : TipUrgency.NEUTRAL,
      tone: isCharging ? 'red' : 'grey',
    }
  }
  switch (health) {
    case BondHealthState.NO_BOND:
      return {
        text: `Post a bond of ${stake(minBondBalanceSol)} to win stake.`,
        urgency: TipUrgency.CRITICAL,
        tone: 'red',
      }
    case BondHealthState.CRITICAL: {
      // Critical bond — fires for in-set OR out-of-set + above-min;
      // bond-driven alert isn't gated by rank. Every value here is the
      // SDK's pre-settlement ESTIMATE for the next not-yet-settled epoch
      // — never a charged-and-settled fact (those live in protected-events
      // after the epoch closes). When the claimable bond sits below the
      // projected floor (topUpToAvoidFee > 0), name the consequence: a
      // fee. The action is the same — top up to clear it.
      const text =
        coverage.topUpToAvoidFee > 0
          ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the bond risk fee.`
          : bondRiskFeeSol > 0
            ? `Estimated bond risk fee ${pay(bondRiskFeeSol)} next epoch.`
            : 'Bond too thin — a bond risk fee can be charged.'
      return { text, urgency: TipUrgency.CRITICAL, tone: 'red' }
    }
    case BondHealthState.WATCH: {
      const text =
        coverage.topUpToKeepStake > 0
          ? `Top up ${topUp(coverage.topUpToKeepStake)} to keep your stake.`
          : 'Bond covers current stake.'
      return { text, urgency: TipUrgency.WARNING, tone: 'yellow' }
    }
    case BondHealthState.SOFT: {
      const text =
        coverage.topUpToIdealKeep > 0
          ? `Top up ${topUp(coverage.topUpToIdealKeep)} to grow stake.`
          : 'Bond meets ideal coverage.'
      // Info/indigo — soft is "good enough but room to grow"; visually
      // distinct from watch's warning-yellow so the user reads the chip as
      // optional, not urgent.
      return { text, urgency: TipUrgency.INFO, tone: 'yellow' }
    }
    case BondHealthState.HEALTHY:
      return {
        text: 'Bond has enough coverage.',
        urgency: TipUrgency.POSITIVE,
        tone: 'green',
      }
    default:
      return assertNever(health)
  }
}

// One CTA source per LEVER. Each helper owns its lever's wording and
// urgency end-to-end; getValidatorTip just picks the highest-severity
// candidate (with lever priority breaking ties). visuals.md doctrine:
// color = severity, glyph = lever — keep them orthogonal at the source.

const SEVERITY_ORDER: Record<TipUrgency, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
  neutral: 4,
}
// Tiebreak at the same severity. Bond first (most actionable, hardest
// block), then bid/rank (same lever — raise the bid), then cap (non-
// actionable explanation), then none (the delta fallback).
const LEVER_ORDER: Record<TipConstraint, number> = {
  bond: 0,
  bid: 1,
  rank: 1,
  cap: 2,
  none: 3,
}

function tip(
  text: string,
  urgency: TipUrgency,
  constraint: TipConstraint,
  delta: number,
  alert?: boolean,
): ValidatorTip {
  return alert
    ? { text, urgency, constraint, delta, alert }
    : { text, urgency, constraint, delta }
}

// Callers must include at least one non-null candidate (in practice the
// always-non-null deltaCta sits at the tail). The signature relies on
// that — if every candidate is null, indexing into the empty array would
// return `undefined` and the cast would mask it.
function selectTip(
  ...candidates: [...(ValidatorTip | null)[], ValidatorTip]
): ValidatorTip {
  const live = candidates.filter((c): c is ValidatorTip => c !== null)
  live.sort(
    (a, b) =>
      SEVERITY_ORDER[a.urgency] - SEVERITY_ORDER[b.urgency] ||
      LEVER_ORDER[a.constraint] - LEVER_ORDER[b.constraint],
  )
  return live[0]
}

// Bond lever. Out-of-set + below-min is a hard block on the bond axis
// (clipBondStakeCap → 0); in-set unhealthy bond gets the canonical
// bondAdvice() text. Returns null when the bond is not the lever to pull
// (out-of-set with bond OK, in-set with healthy bond, or the soft-bond +
// gaining-stake exception — see comment below).
function bondCta(
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  delta: number,
  precomputedCoverage?: BondCoverage,
): ValidatorTip | null {
  const bondBalance = validator.bondBalanceSol ?? 0
  const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0
  const coverage =
    precomputedCoverage ??
    computeBondCoverage(validator, dsSamConfig, winningTotalPmpe)

  // Below-min: the SDK qualification gate (clipBondStakeCap → 0). Only
  // realistic for out-of-set validators (in-set with sub-min is impossible).
  // Wording carries the "qualify" / "re-qualify" framing the in-set CTA
  // doesn't need.
  if (bondBalance < dsSamConfig.minBondBalanceSol) {
    if (bondRiskFeeSol > 0) {
      // Fee top-up alone may not clear the below-min block — pin the CTA to
      // whichever number is bigger so it covers both.
      const topUpAmt = Math.max(
        coverage.topUpToAvoidFee,
        dsSamConfig.minBondBalanceSol - bondBalance,
      )
      return tip(
        topUpAmt > 0
          ? `Top up ${topUp(topUpAmt)} to avoid the fee and re-qualify.`
          : `Estimated bond risk fee ${pay(bondRiskFeeSol)} next epoch.`,
        TipUrgency.CRITICAL,
        TipConstraint.BOND,
        delta,
        true,
      )
    }
    // Below-min with no fee pending: it's an eligibility block, not an
    // active charge. Neutral/grey, not critical-red.
    return tip(
      bondBalance <= 0
        ? `Post a bond of ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`
        : `Top up bond to ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`,
      TipUrgency.NEUTRAL,
      TipConstraint.BOND,
      delta,
    )
  }

  // Above-min: emit the unhealthy-bond CTA via bondAdvice. CRITICAL (fee
  // imminent) fires for in-set OR out-of-set — the fee is bond-driven, not
  // rank-driven, so the alert can't be masked by out-of-set status. WATCH
  // (keep-stake) and SOFT (grow-stake) gate on in-set: when target=0 the
  // stake is leaving regardless of bond, so the "keep" / "grow" advisories
  // are misleading. SOFT additionally defers when delta>0 (the inflow is
  // already arriving — "grow stake" would contradict it).
  const inSet = selectInSet(validator)
  const health = bondHealthFromAuction(
    validator,
    dsSamConfig,
    winningTotalPmpe,
    coverage,
  )
  const fires =
    health === BondHealthState.CRITICAL ||
    (inSet &&
      health === BondHealthState.WATCH &&
      coverage.topUpToKeepStake > 0) ||
    (inSet &&
      health === BondHealthState.SOFT &&
      coverage.topUpToIdealKeep > 0 &&
      delta <= 0)
  if (!fires) return null
  const advice = bondAdvice(
    coverage,
    health,
    bondRiskFeeSol,
    dsSamConfig.minBondBalanceSol,
    bondBalance,
  )
  // Alert (octagon + pulse) ONLY when a fee is actually charged this epoch.
  return tip(
    advice.text,
    health === BondHealthState.CRITICAL
      ? TipUrgency.CRITICAL
      : TipUrgency.WARNING,
    TipConstraint.BOND,
    delta,
    health === BondHealthState.CRITICAL && bondRiskFeeSol > 0,
  )
}

// Bid lever. Two triggers — bid-too-low penalty (critical) and
// out-of-set bid-too-low (warning) — checked independently so the
// more-urgent CTA always wins under severity sort. A validator that
// dropped their bid hard can simultaneously be out-of-set AND penalised;
// nesting the penalty check inside the in-set branch would let the rank
// warning mask the critical penalty. Uses computeBidPenalty so the CTA,
// the bid-penalty breakdown headline, and the Payments tab's penalty
// row all quote the same SOL figure — and so simulation updates them
// together.
function bidCta(
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  delta: number,
): ValidatorTip | null {
  // No auction history → penaltyCoef structurally zero (isNegativeBiddingChange
  // checks against a non-existent lastEpochBidPmpe). Skip the reduce + math
  // for the common new-validator/missing-history rows.
  const hasHistory = (validator.auctions?.length ?? 0) > 0
  const metrics = hasHistory
    ? computeBidPenalty(validator, dsSamConfig, winningTotalPmpe)
    : null
  // Penalty is real money charged this epoch — critical (red), not warning
  // (amber). Fires for in-set OR out-of-set: bid history drives it, not
  // current in/out status. Alert/octagon stays reserved for bond risk fee.
  if (metrics && metrics.penaltyPmpe > 0) {
    return tip(
      `Raise bid or pay a ${pay(metrics.penaltySol)} penalty.`,
      TipUrgency.CRITICAL,
      TipConstraint.BID,
      delta,
    )
  }
  // No penalty — out-of-set with an adequate bond becomes the rank CTA.
  // Below-min bond is the bond lever's territory; defer.
  if (
    !selectInSet(validator) &&
    (validator.bondBalanceSol ?? 0) >= dsSamConfig.minBondBalanceSol
  ) {
    return tip(
      'Bid too low. Raise it to qualify for stake.',
      TipUrgency.WARNING,
      TipConstraint.RANK,
      delta,
    )
  }
  return null
}

function capCauseLine(
  type: AuctionConstraintType | undefined,
  name: string | undefined,
): string {
  switch (type) {
    case AuctionConstraintType.COUNTRY:
      return `${name ?? 'Country'} at country cap`
    case AuctionConstraintType.ASO:
      return `${name ?? 'ASO'} at ASO cap`
    case AuctionConstraintType.VALIDATOR:
      return 'At per-validator cap'
    case AuctionConstraintType.WANT:
      return 'At your stake-wanted setting'
    default:
      return 'At a concentration cap'
  }
}

// Cap lever. In-set + losing stake + a binding concentration cap
// (totalLeftToCapSol === 0). Non-actionable explanation — the validator
// can't unilaterally clear an ASO/country cap. Urgency:info keeps the
// chip distinct from warning-yellow (which implies "act"); cap outranks
// the generic delta-losing message via mutual exclusion in deltaCta, not
// by lying about urgency.
function capCta(
  validator: AugmentedAuctionValidator,
  delta: number,
): ValidatorTip | null {
  const cap = validator.lastCapConstraint
  if (delta >= 0 || cap == null || cap.totalLeftToCapSol !== 0) return null
  // Two-line CTA: cause on line 1, consequence on line 2. The pill in
  // sam-table.tsx renders with `whitespace-pre-line` so \n is honoured.
  // COUNTRY/ASO carry a meaningful name; VALIDATOR's name is the vote
  // account, so omit. Unknown enum values fall through to the generic phrasing.
  const cause = capCauseLine(cap.constraintType, cap.constraintName)
  return tip(
    `${cause}\nLosing ${stake(Math.abs(delta))} until cap frees.`,
    TipUrgency.INFO,
    TipConstraint.CAP,
    delta,
  )
}

// Delta lever — the "stake trajectory" fallback. Always emits something
// for in-set validators except when the cap lever explains the loss
// (mutual exclusion at source so we don't have to lie with urgency).
function deltaCta(delta: number, capBinding: boolean): ValidatorTip {
  if (delta > 0) {
    return tip(
      `${stake(delta)} arriving next epoch.`,
      TipUrgency.POSITIVE,
      TipConstraint.NONE,
      delta,
    )
  }
  // delta < 0 with a binding cap: cap owns the narrative — surface 'at
  // target' so cap (info) isn't beaten by losing (warning).
  if (delta === 0 || capBinding) {
    return tip(
      'At target stake.',
      TipUrgency.NEUTRAL,
      TipConstraint.NONE,
      delta,
    )
  }
  return tip(
    `Losing ${stake(Math.abs(delta))} next epoch.`,
    TipUrgency.WARNING,
    TipConstraint.NONE,
    delta,
  )
}

export const getValidatorTip = (
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  // Hot-path optimisation: per-row callers (sam-table) precompute the
  // coverage to feed both the bond chip AND this tip. Passing it through
  // avoids a second computeBondCoverage call inside bondCta.
  precomputedCoverage?: BondCoverage,
): ValidatorTip => {
  const delta = validator.values.expectedStakeChangeSol ?? 0
  const cap = capCta(validator, delta)
  return selectTip(
    bondCta(
      validator,
      dsSamConfig,
      winningTotalPmpe,
      delta,
      precomputedCoverage,
    ),
    bidCta(validator, dsSamConfig, winningTotalPmpe, delta),
    cap,
    deltaCta(delta, cap !== null),
  )
}

export type ApyBreakdownValue = {
  inflation: number
  mev: number
  blockRewards: number
  stakeBid: number
  total: number
}

export const getApyBreakdown = (
  validator: AuctionValidator,
  epochsPerYear: number,
): ApyBreakdownValue => {
  const bd = apyBreakdown(validator, epochsPerYear)
  return {
    inflation: bd.inflation,
    mev: bd.mev,
    blockRewards: bd.blockRewards,
    stakeBid: bd.bid,
    total: bd.total,
  }
}

// Used by sam-table's "Stake / Next Δ" cell. Sub-1-SOL deltas are neutral —
// they round to the same whole-SOL display and aren't actionable.
export type NextStakeDeltaTone = 'positive' | 'negative' | 'neutral'
export type NextStakeDeltaCell = {
  prefix: '+' | ''
  tone: NextStakeDeltaTone
}
export function nextStakeDeltaCell(expectedChange: number): NextStakeDeltaCell {
  if (Math.abs(expectedChange) < 1) return { prefix: '', tone: 'neutral' }
  if (expectedChange > 0) return { prefix: '+', tone: 'positive' }
  return { prefix: '', tone: 'negative' }
}

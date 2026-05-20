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

// Two thresholds for the severity ladder, hoisted so bondAdvice can also
// use NON_TRIVIAL_STAKE_SOL:
//   NON_TRIVIAL_STAKE_SOL — validator HAS real stake (atRisk gate). 10k
//     is the practical "real validator vs novelty" line on Solana.
//   NON_TRIVIAL_LOSS_SOL — validator IS LOSING meaningful stake this
//     epoch (defend-lever gate). 1k is small enough to flag any
//     non-noise outflow, large enough to ignore rounding/cooldown jitter.
const NON_TRIVIAL_STAKE_SOL = 10_000
const NON_TRIVIAL_LOSS_SOL = 1_000

export function bondAdvice(
  coverage: BondCoverage,
  health: BondHealthState,
  bondRiskFeeSol: number,
  minBondBalanceSol: number,
  bondBalanceSol: number,
  marinadeActivatedStakeSol: number,
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
    case BondHealthState.NO_BOND: {
      // Novelty validators (active < 10k SOL) are effectively outside the
      // auction already — surface the CTA muted/grey. Only escalate to red
      // when there's real stake at risk of being pulled.
      const hasRealStake = marinadeActivatedStakeSol > NON_TRIVIAL_STAKE_SOL
      return {
        text: `Post a bond of ${stake(minBondBalanceSol)} to win stake.`,
        urgency: hasRealStake ? TipUrgency.CRITICAL : TipUrgency.NEUTRAL,
        tone: hasRealStake ? 'red' : 'grey',
      }
    }
    case BondHealthState.CRITICAL: {
      // Four honest states — SDK bondRiskFeeSol is the authoritative fee
      // signal; topUpToAvoidFee only means "below projected floor", not
      // "fee is being charged". Gate "avoid the fee" on both.
      const text =
        coverage.topUpToAvoidFee > 0 && bondRiskFeeSol > 0
          ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the bond risk fee.`
          : bondRiskFeeSol > 0
            ? `Estimated bond risk fee ${pay(bondRiskFeeSol)} next epoch.`
            : coverage.topUpToAvoidFee > 0
              ? `Top up ${topUp(coverage.topUpToAvoidFee)} — bond below the penalty threshold.`
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
// candidate (with lever priority breaking ties). VISUALS.md doctrine:
// color = severity, glyph = lever — keep them orthogonal at the source.

const SEVERITY_ORDER: Record<TipUrgency, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
  neutral: 4,
}
// Tiebreak at the same severity. Bond first (most actionable, hardest
// block), then bid/rank (same lever — raise the bid), then cap, then
// external block (samBlocked / blacklist), then none (the delta fallback).
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
    // Below-min, no SDK fee yet. Severity follows the global ladder:
    //   yellow — defending (meaningful stake leaving).
    //   grey   — eligibility-only, novelty validator with no real stake.
    return tip(
      bondBalance <= 0
        ? `Post a bond of ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`
        : `Top up bond to ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`,
      isDefending(validator, delta) ? TipUrgency.WARNING : TipUrgency.NEUTRAL,
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
    validator.marinadeActivatedStakeSol,
  )
  // Use bondAdvice's urgency as the canonical source — same severity the
  // breakdown banner uses. Alert (octagon) ONLY when a fee is actually
  // charged this epoch.
  return tip(
    advice.text,
    advice.urgency,
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
  // Penalty is real money charged this epoch — red + octagon (cost lever
  // = red + alert glyph everywhere in the engine). Fires for in-set OR
  // out-of-set; bid history drives it, not current in/out status.
  if (metrics && metrics.penaltyPmpe > 0) {
    return tip(
      `Raise bid or pay a ${pay(metrics.penaltySol)} penalty.`,
      TipUrgency.CRITICAL,
      TipConstraint.BID,
      delta,
      true,
    )
  }
  // No penalty — out-of-set with an adequate bond becomes the rank CTA,
  // BUT only when the bid is actually the problem. A validator can be
  // out-of-set with a totalPmpe well above the winning total because a
  // country/ASO/validator cap binds, or because they're sam-blocked. In
  // those cases telling them to raise the bid is a lie — defer to capCta
  // (or stay silent).
  if (
    !selectInSet(validator) &&
    (validator.bondBalanceSol ?? 0) >= dsSamConfig.minBondBalanceSol &&
    validator.revShare.totalPmpe < winningTotalPmpe
  ) {
    // Bid too low — growth lever in general (raise the bid → qualify),
    // escalates to defend lever (yellow) when meaningful stake is leaving
    // so it outranks the generic "Losing N" delta narrative.
    return tip(
      'Bid too low. Raise it to qualify for stake.',
      isDefending(validator, delta) ? TipUrgency.WARNING : TipUrgency.INFO,
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
      return 'At your `maxStakeWanted` setting'
    default:
      return 'At a concentration cap'
  }
}

// Defend-lever predicate: a real validator is actively losing meaningful
// stake this epoch. Single source so the 5 CTA branches that gate WARNING
// vs INFO/NEUTRAL don't drift apart.
function isDefending(
  validator: AugmentedAuctionValidator,
  delta: number,
): boolean {
  return (
    (validator.marinadeActivatedStakeSol ?? 0) > NON_TRIVIAL_STAKE_SOL &&
    Math.abs(delta) > NON_TRIVIAL_LOSS_SOL
  )
}

// Out-of-set despite a high enough totalPmpe. The bid isn't the lever —
// some other constraint binds. Names the actual reason so the user knows
// what to investigate (or accept) instead of seeing the deltaCta's
// misleading "Losing N SOL" symptom.
//
// Reasons in priority order (most specific first):
//   - samBlocked: hard block during auction (penalty escalation, etc.)
//   - maxStakeWanted === 0: validator opted out of stake entirely
//   - samEligible === false: failed pre-auction gate — narrowed down by
//     inspecting bondBalanceSol / blacklist where we can; falls back to
//     a "check the usual suspects" hint otherwise
//   - lastCapConstraint binding: concentration / want cap
//   - default: generic "constraint binds, investigate"
//
// Severity tracks ACTIVE STAKE — > 10k means real stake at risk so the
// tip goes critical-red; otherwise grey/neutral.
function outOfSetCta(
  validator: AugmentedAuctionValidator,
  winningTotalPmpe: number,
  delta: number,
  blacklist?: Set<string>,
): ValidatorTip | null {
  if (selectInSet(validator)) return null
  // Bid actually is the lever to pull → let bidCta own the message.
  if (validator.revShare.totalPmpe < winningTotalPmpe) return null

  // Severity ladder, applied throughout this function:
  //   red    — a real penalty is charged this epoch. Set tip.alert so the
  //            pill swaps to the octagon glyph.
  //   yellow — meaningful active stake is leaving (no penalty yet — "don't
  //            lose stake"). Gated on both atRisk AND non-trivial delta.
  //   violet — growth lever available ("get more stake" if you act).
  //   grey   — user's own choice / informational.
  const defending = isDefending(validator, delta)

  if (validator.samBlocked) {
    // Testing-only state — production traffic shouldn't reach here. Kept
    // red + octagon as a loud "this should never ship live" signal; not
    // worth the conditional-severity logic the other branches need.
    return tip(
      'Blocked from SAM this epoch.',
      TipUrgency.CRITICAL,
      TipConstraint.NONE,
      delta,
      true,
    )
  }
  // Opt-out is the most informative explanation when both apply — check
  // before cap so 'maxStakeWanted=0 + cap binding' shows the user's choice,
  // not the cap symptom.
  if (validator.maxStakeWanted === 0) {
    // User's own choice — grey when not losing meaningful stake. When
    // defending (meaningful active stake leaving), escalate to yellow so
    // this message outranks deltaCta's "Losing N SOL" and names the cause.
    return tip(
      'Max-stake-wanted set to 0 — opted out.',
      defending ? TipUrgency.WARNING : TipUrgency.NEUTRAL,
      TipConstraint.NONE,
      delta,
    )
  }
  // Gate on === false so an undefined samEligible (SDK pre-auction state)
  // doesn't route through the "not eligible" fallback by accident.
  if (validator.samEligible === false) {
    // Narrow the eligibility failure to the most actionable specific cause
    // we can detect from data we have. Bond + blacklist are cheap checks;
    // client-version semver matching and per-epoch vote-credit thresholds
    // need the SDK's internal computation — fall through to a hint that
    // names the remaining suspects.
    if (validator.bondBalanceSol == null) {
      // Growth lever — post a bond and you can win stake. Violet.
      return tip(
        'No bond posted. Add a bond to qualify.',
        TipUrgency.INFO,
        TipConstraint.BOND,
        delta,
      )
    }
    if (blacklist?.has(validator.voteAccount)) {
      // Red ONLY when the blacklist penalty is actively charging this
      // epoch (revShare.blacklistPenaltyPmpe > 0) — real money, octagon.
      // Otherwise it's informational ("flagged but no charge this epoch")
      // and stays grey regardless of stake size.
      const penaltyPmpe = validator.revShare?.blacklistPenaltyPmpe ?? 0
      if (penaltyPmpe > 0) {
        const penaltySol =
          (penaltyPmpe / 1000) * (validator.marinadeActivatedStakeSol ?? 0)
        return tip(
          `Blacklisted — ${pay(penaltySol)} penalty this epoch.`,
          TipUrgency.CRITICAL,
          TipConstraint.NONE,
          delta,
          true,
        )
      }
      // Yellow when defending so this message outranks deltaCta's symptom.
      return tip(
        'Blacklisted by Marinade.',
        defending ? TipUrgency.WARNING : TipUrgency.NEUTRAL,
        TipConstraint.NONE,
        delta,
      )
    }
    // Growth lever — fix the eligibility checks and you can qualify.
    // Escalate to yellow when defending so this names the cause instead of
    // letting deltaCta's "Losing N SOL" win the severity sort.
    return tip(
      'Not eligible — check client version and vote credits.',
      defending ? TipUrgency.WARNING : TipUrgency.INFO,
      TipConstraint.NONE,
      delta,
    )
  }
  const cap = validator.lastCapConstraint
  if (cap && cap.totalLeftToCapSol === 0) {
    // WANT cap = user-set → grey (their choice).
    // Other caps: yellow when stake is actively leaving in meaningful
    // amounts, else violet (informational, no immediate loss).
    const capUrgency =
      cap.constraintType === AuctionConstraintType.WANT
        ? TipUrgency.NEUTRAL
        : defending
          ? TipUrgency.WARNING
          : TipUrgency.INFO
    return tip(
      `${capCauseLine(cap.constraintType, cap.constraintName)}.`,
      capUrgency,
      TipConstraint.CAP,
      delta,
    )
  }
  // Generic fallback — total clears winning, no other branch fired.
  // Yellow when defending (stake leaving); violet otherwise (growth lever
  // — adjusting the suspects could let you in).
  return tip(
    'Check `maxStakeWanted` and bond-stake capacity.',
    defending ? TipUrgency.WARNING : TipUrgency.INFO,
    TipConstraint.NONE,
    delta,
  )
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
  // Severity follows the global ladder:
  //   grey   — WANT cap (user-set).
  //   yellow — other cap AND defending (meaningful stake leaving).
  //   violet — other cap but the loss is novelty-scale (informational).
  const urgency =
    cap.constraintType === AuctionConstraintType.WANT
      ? TipUrgency.NEUTRAL
      : isDefending(validator, delta)
        ? TipUrgency.WARNING
        : TipUrgency.INFO
  const cause = capCauseLine(cap.constraintType, cap.constraintName)
  return tip(
    `${cause}\nLosing ${stake(Math.abs(delta))} until cap frees.`,
    urgency,
    TipConstraint.CAP,
    delta,
  )
}

// Delta lever — the "stake trajectory" fallback. Always emits something
// for in-set validators except when the cap lever explains the loss
// (mutual exclusion at source so we don't have to lie with urgency).
function deltaCta(
  validator: AugmentedAuctionValidator,
  delta: number,
  capBinding: boolean,
): ValidatorTip {
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
    // Three flavours of "delta=0":
    //   a) at validator's own max-stake-wanted cap (their lever)
    //   b) active ≈ target — really at the SAM-assigned target
    //   c) active well below target — budget didn't reach this row
    // "At target stake" is only honest in (b); (c) made the message a lie on
    // budget-constrained runs (active 30k, target 72k, delta 0 -> "At target").
    const wanted = validator.maxStakeWanted
    const target = validator.auctionStake.marinadeSamTargetSol
    const active = validator.marinadeActivatedStakeSol
    const atOwnCap = wanted != null && target >= wanted - 1e-9
    const belowTarget = target > 0 && active < target * 0.99
    const text = atOwnCap
      ? 'At your `maxStakeWanted` setting.'
      : belowTarget
        ? 'Stake won’t change next epoch.'
        : 'At target stake.'
    return tip(text, TipUrgency.NEUTRAL, TipConstraint.NONE, delta)
  }
  // Reaching deltaCta with delta<0 + no higher lever firing means natural
  // withdrawal (pool-wide redeemer outflow) is the only realistic cause in
  // production. Penalty-undelegation would have escalated to bond/bid CTA
  // before this branch. The residual non-natural case is over-target drift
  // (active > target, cooldown converging) — exotic, mostly seen on hand-
  // crafted test fixtures; leave it generic rather than guess a cause.
  const naturalOut = Math.abs(
    validator.values.expectedStakeNaturalWithdrawalSol ?? 0,
  )
  const cause = naturalOut > 0 ? ' — pool withdrawals.' : '.'
  // Yellow only when the loss is meaningful (isDefending). Sub-threshold
  // losses (< 1k SOL or < 10k active) stay violet so a specific-reason
  // CTA at INFO level (bid too low, not-eligible) can outrank the symptom.
  return tip(
    `Losing ${stake(Math.abs(delta))} next epoch${cause}`,
    isDefending(validator, delta) ? TipUrgency.WARNING : TipUrgency.INFO,
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
  // Optional blacklist set from the auction data — lets outOfSetCta name
  // the specific eligibility failure when blacklist is the cause.
  blacklist?: Set<string>,
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
    outOfSetCta(validator, winningTotalPmpe, delta, blacklist),
    cap,
    deltaCta(validator, delta, cap !== null),
  )
}

export type ApyBreakdownValue = {
  inflation: number
  mev: number
  blockRewards: number
  staticBid: number
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
    staticBid: bd.bid,
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

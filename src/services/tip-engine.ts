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

import { bidTooLowPenaltySol } from './bid-penalty'
import { computeBondCoverage } from './bond-coverage'
import { bondHealthFromAuction } from './bond-health'
import { apyBreakdown } from './calculations'
import { selectInSet } from './sam'

import type { BondCoverage } from './bond-coverage'
import type { BondHealthState } from './bond-health'
import type { AugmentedAuctionValidator } from './sam'
import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type React from 'react'

export type TipUrgency =
  | 'critical'
  | 'warning'
  | 'info'
  | 'positive'
  | 'neutral'
export type TipConstraint = 'rank' | 'bond' | 'bid' | 'cap' | 'none'

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
  if (health === 'no-bond' || health === 'critical') {
    return { color: CSS_DESTRUCTIVE, bg: CSS_DESTRUCTIVE_LIGHT }
  }
  if (health === 'watch' || health === 'soft') {
    return { color: CSS_STATUS_YELLOW, bg: CSS_STATUS_YELLOW_LIGHT }
  }
  return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10 }
}

// Color carries severity. Glyph carries the lever — except a critical
// alarm also swaps to the alert glyph; see getTipIcon.
export const getTipStyle = (urgency: TipUrgency): TipStyle => {
  switch (urgency) {
    case 'critical':
      return { color: CSS_DESTRUCTIVE, bg: CSS_DESTRUCTIVE_LIGHT }
    case 'warning':
      return { color: CSS_WARNING, bg: CSS_WARNING_LIGHT }
    case 'info':
      return { color: CSS_INFO, bg: CSS_INFO_LIGHT }
    case 'positive':
      return { color: CSS_PRIMARY, bg: CSS_PRIMARY_LIGHT_10 }
    default:
      return { color: CSS_MUTED_FG, bg: CSS_MUTED }
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
    case 'bond':
      return ICON_BOND
    // 'bid' and 'rank' share the same lever (raise the bid) → same glyph.
    // Visual-language rule: glyph = the lever, never an axis duplicate.
    case 'bid':
    case 'rank':
      return ICON_BID
    case 'cap':
      return ICON_CAP
    default:
      if (tip.delta > 0) return ICON_UP
      if (tip.delta < 0) return ICON_DOWN
      return ICON_RIGHT
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
  tone: 'red' | 'yellow' | 'green'
}

export function bondAdvice(
  coverage: BondCoverage,
  health: BondHealthState,
  bondRiskFeeSol: number,
  minBondBalanceSol: number,
  bondBalanceSol: number,
): BondAdvice {
  if (health === 'no-bond') {
    return {
      text: `Post a bond of ${stake(minBondBalanceSol)} to win stake.`,
      urgency: 'critical',
      tone: 'red',
    }
  }
  // Below the SDK minimum: clipBondStakeCap → 0, a hard block. Tell the
  // validator what to do — top up the bond to the minimum.
  if (bondBalanceSol < minBondBalanceSol) {
    return {
      text: `Top up bond to ${stake(minBondBalanceSol)} to win stake.`,
      urgency: 'critical',
      tone: 'red',
    }
  }
  if (health === 'critical') {
    // Only claim "avoid the fee" when a fee actually applies
    // (bondRiskFeeSol>0). topUpToAvoidFee>0 alone is "claimable below the
    // projected floor" — not the same as a charged fee; for out-of-set or
    // otherwise no-fee rows, the truthful CTA is keep-stake, not a false
    // fee claim.
    const text =
      bondRiskFeeSol > 0
        ? coverage.topUpToAvoidFee > 0
          ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the bond risk fee.`
          : `Bond risk fee ${pay(bondRiskFeeSol)} this epoch.`
        : coverage.topUpToAvoidFee > 0
          ? `Top up ${topUp(coverage.topUpToAvoidFee)} to keep your stake.`
          : 'Bond too thin — a bond risk fee can be charged.'
    return { text, urgency: 'critical', tone: 'red' }
  }
  if (health === 'watch') {
    const text =
      coverage.topUpToKeepStake > 0
        ? `Top up ${topUp(coverage.topUpToKeepStake)} to keep your stake.`
        : 'Bond covers current stake.'
    return { text, urgency: 'warning', tone: 'yellow' }
  }
  if (health === 'soft') {
    const text =
      coverage.topUpToIdealKeep > 0
        ? `Top up ${topUp(coverage.topUpToIdealKeep)} to grow stake.`
        : 'Bond meets ideal coverage.'
    // Info/indigo — soft is "good enough but room to grow"; visually
    // distinct from watch's warning-yellow so the user reads the chip as
    // optional, not urgent.
    return { text, urgency: 'info', tone: 'yellow' }
  }
  return {
    text: 'Bond has enough coverage.',
    urgency: 'positive',
    tone: 'green',
  }
}

// Cap-binding CTA. When the validator is in-set, bond and bid are fine
// (the cascades above didn't fire), and stake is leaking out, the BINDING
// cause is the concentration cap (ASO or country) — not the bid and not
// the bond. Guard on totalLeftToCapSol === 0 to isolate the actually-at-
// cap case (the SDK populates lastCapConstraint with last-pass info even
// when there's room left). Urgency:info — nothing the validator can do
// via bond/bid; calling it warning would imply user error.
function capBindingTip(
  validator: AugmentedAuctionValidator,
  delta: number,
): ValidatorTip | null {
  const cap = validator.lastCapConstraint
  if (delta >= 0 || cap == null || cap.totalLeftToCapSol !== 0) return null
  const losing = stake(Math.abs(delta))
  // Two-line CTA: cause on line 1, consequence on line 2. The pill in
  // sam-table.tsx renders with `whitespace-pre-line` so \n is honoured.
  const cause =
    cap.constraintType === AuctionConstraintType.COUNTRY
      ? `${cap.constraintName} at country cap`
      : `${cap.constraintName} ${cap.constraintType} at cap`
  return {
    text: `${cause}\nLosing ${losing} until cap frees.`,
    urgency: 'info',
    constraint: 'cap',
    delta,
  }
}

function outOfSetTip(
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  delta: number,
): ValidatorTip {
  const bondBalance = validator.bondBalanceSol ?? 0
  // Out-of-set with an adequate bond means the BID is why you're out —
  // raising it is the lever, not growing the bond (a bond top-up can't get
  // you in). Only the hard blocks below — sub-min / no-bond, or an
  // impending fee — outrank the bid here; everything else falls to the
  // bid-too-low message.
  // Bond below SDK's `minBondBalanceSol`: clipBondStakeCap returns 0 so the
  // validator can't win any stake regardless of bid — a hard block, hence
  // critical (red). bond-health also reports 'no-bond'/'critical' here, so
  // chip and tip agree on tone.
  if (bondBalance < dsSamConfig.minBondBalanceSol) {
    // Hierarchy: an impending bond risk fee is the most pressing remedy and
    // leads — but only when a fee actually applies (a number exists). Absent
    // a fee, below-min is the hard block and "qualify" is the right call.
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig,
      winningTotalPmpe,
    )
    const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0
    // Fee impending leads — but only when a fee actually applies. Absent a
    // fee (bondRiskFeeSol === 0), below-min is the hard block and "qualify"
    // is the right call — no false "avoid the fee" claim and no alert.
    if (bondRiskFeeSol > 0) {
      return {
        text:
          coverage.topUpToAvoidFee > 0
            ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the bond risk fee.`
            : `Bond risk fee ${pay(bondRiskFeeSol)} this epoch.`,
        urgency: 'critical',
        constraint: 'bond',
        alert: true,
        delta,
      }
    }
    const text =
      bondBalance <= 0
        ? `Post a bond of ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`
        : `Top up bond to ${stake(dsSamConfig.minBondBalanceSol)} to qualify.`
    return {
      text,
      urgency: 'critical',
      constraint: 'bond',
      delta,
    }
  }
  return {
    text: 'Bid too low. Raise it to qualify for stake.',
    urgency: 'warning',
    constraint: 'rank',
    delta,
  }
}

export const getValidatorTip = (
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
): ValidatorTip => {
  const inSet = selectInSet(validator)
  const delta = validator.values.expectedStakeChangeSol ?? 0
  const health = bondHealthFromAuction(validator, dsSamConfig, winningTotalPmpe)

  // Out-of-set validators: distinguish bid-too-low from bond-blocked.
  // A would-be winner whose bid clears the threshold but whose bond can't
  // back more stake gets the bond CTA, not the rank CTA.
  if (!inSet)
    return outOfSetTip(validator, dsSamConfig, winningTotalPmpe, delta)

  // Bond CTA cascade — priority: avoid fee > keep stake > ideal. All three
  // strings come from the canonical bondAdvice() so the breakdown banner
  // and the header/pill never diverge.
  if (health === 'critical' || health === 'watch' || health === 'soft') {
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig,
      winningTotalPmpe,
    )
    const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0
    const advice = bondAdvice(
      coverage,
      health,
      bondRiskFeeSol,
      dsSamConfig.minBondBalanceSol,
      validator.bondBalanceSol ?? 0,
    )

    if (health === 'critical') {
      return {
        text: advice.text,
        urgency: 'critical',
        constraint: 'bond',
        // Alert (octagon + pulse) ONLY when a fee is actually charged this
        // epoch — not for thin-bond/topUp-only criticality.
        alert: bondRiskFeeSol > 0,
        delta,
      }
    }

    if (health === 'watch' && coverage.topUpToKeepStake > 0) {
      return {
        text: advice.text,
        urgency: 'warning',
        constraint: 'bond',
        delta,
      }
    }

    // Soft is advisory only (lowest urgency, not a present danger). "Top up
    // to grow stake" would directly contradict a genuine positive delta —
    // stake is already arriving. The bond-coverage top-up sizes the bond vs
    // *current* exposed stake and is independent of the auction's
    // redelegation allocation that drives delta, so the two can disagree.
    // When stake is genuinely growing, the positive "arriving next epoch"
    // message wins; the Soft bond chip still surfaces independently.
    // (critical fee + watch keep-stake stay ahead of delta: the inflow does
    // not pay a fee nor refill the bond, so that advice is truthful even
    // while gaining.)
    if (health === 'soft' && coverage.topUpToIdealKeep > 0 && delta <= 0) {
      return {
        text: advice.text,
        urgency: 'warning',
        constraint: 'bond',
        delta,
      }
    }
  }

  // Bid-too-low penalty active and bond is fine — the cascade above already
  // returned for any bond-primary case, so the actionable problem here is the
  // bid drifting down. Advise raising it, with the recurring penalty as the
  // cost avoided (action + quantified consequence, same family as bondAdvice).
  const penaltyPmpe = validator.revShare?.bidTooLowPenaltyPmpe ?? 0
  if (penaltyPmpe > 0) {
    const penaltySol = bidTooLowPenaltySol(validator)
    return {
      text: `Raise bid or pay a ${pay(penaltySol)} penalty.`,
      // Penalty is real money charged this epoch — critical (red), not
      // warning (amber). The alert/octagon stays reserved for bond risk
      // fee; bid penalty is critical-red without the octagon escalation.
      urgency: 'critical',
      constraint: 'bid',
      delta,
    }
  }

  const capTip = capBindingTip(validator, delta)
  if (capTip) return capTip

  if (delta > 0) {
    return {
      text: `${stake(delta)} arriving next epoch.`,
      urgency: 'positive',
      constraint: 'none',
      delta,
    }
  }

  if (delta === 0) {
    return {
      text: 'At target stake.',
      urgency: 'neutral',
      constraint: 'none',
      delta,
    }
  }

  return {
    text: `Losing ${stake(Math.abs(delta))} next epoch.`,
    urgency: 'warning',
    constraint: 'none',
    delta,
  }
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

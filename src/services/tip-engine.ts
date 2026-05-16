import { ICON_BID } from 'src/components/icons/icon-bid'
import { ICON_BOND } from 'src/components/icons/icon-bond'
import { ICON_DOWN } from 'src/components/icons/icon-down'
import { ICON_RANK } from 'src/components/icons/icon-rank'
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

import { computeBondCoverage } from './bond-coverage'
import { bondHealthFromAuction } from './bond-health'
import { apyBreakdown } from './calculations'

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
export type TipConstraint = 'rank' | 'bond' | 'bid' | 'none'

export interface ValidatorTip {
  text: string
  urgency: TipUrgency
  constraint: TipConstraint
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

// Color carries severity ONLY. Glyph never does — see getTipIcon.
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

// Glyph carries the tip's MEANING (which lever to pull), never its severity.
// A constraint maps to one fixed non-directional glyph. Only constraint:'none'
// (the validator is in-set, the only lever left is the stake trajectory) gets
// a directional arrow, and it is keyed off the real signed delta so it can
// never lie — an up arrow appears iff stake is genuinely growing.
export const getTipIcon = (tip: ValidatorTip): React.ReactNode => {
  switch (tip.constraint) {
    case 'bond':
      return ICON_BOND
    case 'bid':
      return ICON_BID
    case 'rank':
      return ICON_RANK
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
      text: `Post a bond of ${stake(minBondBalanceSol)} to be in set.`,
      urgency: 'critical',
      tone: 'red',
    }
  }
  // Below the SDK minimum: clipBondStakeCap → 0, a hard block. Tell the
  // validator what to do — top up the bond to the minimum.
  if (bondBalanceSol < minBondBalanceSol) {
    return {
      text: `Top up bond to ${stake(minBondBalanceSol)} to be in set.`,
      urgency: 'critical',
      tone: 'red',
    }
  }
  if (health === 'critical') {
    // A fee is charged / imminent. The top-up that clears it is the
    // decisive value; only when no top-up is computable do we fall back
    // to the fee figure.
    const text =
      coverage.topUpToAvoidFee > 0
        ? `Top up ${topUp(coverage.topUpToAvoidFee)} to avoid the bond risk fee.`
        : bondRiskFeeSol > 0
          ? `Bond risk fee ${pay(bondRiskFeeSol)} this epoch.`
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
    return { text, urgency: 'info', tone: 'yellow' }
  }
  return {
    text: 'Bond has enough coverage.',
    urgency: 'positive',
    tone: 'green',
  }
}

function outOfSetTip(
  validator: AugmentedAuctionValidator,
  dsSamConfig: DsSamConfig,
  winningTotalPmpe: number,
  health: BondHealthState,
  delta: number,
): ValidatorTip {
  const bondBalance = validator.bondBalanceSol ?? 0
  if (health !== 'healthy') {
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    // Below-min stays a hard critical block; otherwise the canonical bond
    // advice (top-up to grow / keep) — same string the breakdown shows.
    if (bondBalance >= dsSamConfig.minBondBalanceSol) {
      const topUpSol =
        coverage.topUpToIdealKeep > 0
          ? coverage.topUpToIdealKeep
          : coverage.topUpToKeepStake
      if (topUpSol > 0) {
        return {
          text: `Top up ${topUp(topUpSol)} to grow stake.`,
          urgency: 'warning',
          constraint: 'bond',
          delta,
        }
      }
    }
  }
  // Bond below SDK's `minBondBalanceSol`: clipBondStakeCap returns 0 so the
  // validator can't win any stake regardless of bid — a hard block, hence
  // critical (red). bond-health also reports 'no-bond'/'critical' here, so
  // chip and tip agree on tone.
  if (bondBalance < dsSamConfig.minBondBalanceSol) {
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
  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const delta = validator.values.expectedStakeChangeSol ?? 0
  const health = bondHealthFromAuction(validator, dsSamConfig, winningTotalPmpe)

  // Out-of-set validators: distinguish bid-too-low from bond-blocked.
  // A would-be winner whose bid clears the threshold but whose bond can't
  // back more stake gets the bond CTA, not the rank CTA.
  if (!inSet)
    return outOfSetTip(validator, dsSamConfig, winningTotalPmpe, health, delta)

  // Bond CTA cascade — priority: avoid fee > keep stake > ideal. All three
  // strings come from the canonical bondAdvice() so the breakdown banner
  // and the header/pill never diverge.
  if (health === 'critical' || health === 'watch' || health === 'soft') {
    const coverage = computeBondCoverage(
      validator,
      dsSamConfig.minBondEpochs,
      dsSamConfig.idealBondEpochs,
      winningTotalPmpe,
      dsSamConfig.bondRiskFeeMult,
    )
    const bondRiskFeeSol = validator.values?.bondRiskFeeSol ?? 0
    const advice = bondAdvice(
      coverage,
      health,
      bondRiskFeeSol,
      dsSamConfig.minBondBalanceSol,
      validator.bondBalanceSol ?? 0,
    )

    if (
      health === 'critical' &&
      (bondRiskFeeSol > 0 || coverage.topUpToAvoidFee > 0)
    ) {
      return {
        text: advice.text,
        urgency: 'critical',
        constraint: 'bond',
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
      return { text: advice.text, urgency: 'info', constraint: 'bond', delta }
    }
  }

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

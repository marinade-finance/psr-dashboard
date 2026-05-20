---
status: planned
---

# CTA engine — unified shape + sim pre-fill

Two related improvements to the action-tip surface: giving every CTA a
quantified consequence, and wiring "Simulate →" to pre-fill the suggested
values.

## CTA family: action + quantified consequence

**Why:** many CTAs today are unquantified ("Losing N SOL next epoch." has a
stake number but no remedy amount; "Top up to qualify" has no stake upside).
A validator cannot weigh the action without knowing both the cost and the
consequence.

**Canonical shape:** `Action N SOL [or|to] Consequence M SOL.`

| State                                              | CTA shape                         | Number source                                           |
| -------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| Holds stake, bond below min (critical, clips to 0) | `Top up N SOL or lose M SOL.`     | N: `computeBondCoverage.topUpToKeepStake`; M: row delta |
| No stake, wants in                                 | `Top up N SOL to win M SOL.`      | carrot, no "or lose"                                    |
| Bond thin, risk fee imminent                       | `Top up N SOL or pay ~M SOL fee.` | M: `bondRiskFeeSol`                                     |
| Stake shrinks due to bid                           | `Raise bid or lose M SOL.`        | bid action unquantified — see below                     |

Bid-side: `computeInAuctionTarget` / `computeNextEpochStake` carry a
"last-price coupling" caveat and are not yet trusted as headline numbers. Keep
bid CTAs action-unquantified (`Raise bid or lose M SOL.`) until estimate
reliability is confirmed or the action is gated behind Simulate.

**Where:** `src/services/tip-engine.ts` — `bondAdvice()` and the `Losing` branch
(~line 326, route by cause). Bond coverage numbers from `computeBondCoverage`.

## Simulation pre-fill from breakdown CTAs

**Why:** "Simulate →" today is a navigation, not a recommendation. The
breakdown already computed the target value; the user has to remember and
re-type it in the sim panel. Pre-fill closes the loop.

**What each CTA pre-fills:**

| Breakdown + CTA                | Field to seed                                |
| ------------------------------ | -------------------------------------------- |
| Bidding "Get into the auction" | `bid` ← `inAuction.targetBidPmpe`            |
| Bidding "Next epoch stake"     | `bid` ← `nextEpoch.targetBidPmpePriority`    |
| Bond "Top up to keep stake"    | `bond` ← `bondBalanceSol + topUpToKeepStake` |
| Bond "Top up to avoid the fee" | `bond` ← `bondBalanceSol + topUpToAvoidFee`  |
| Bid-penalty "Raise bid"        | `bid` ← `metrics.adjustedLimit`              |
| Payments "Simulate"            | no seed — current state (existing)           |

**Wiring:** extend `onGoToSim` callback from `() => void` to
`(seed?: { bid?: number; bond?: number; infl?: number; mev?: number; blk?: number }) => void`.
Each breakdown passes the relevant suggestion. The sim panel seeds its
controlled inputs from those values when present, falls back to current.

**Where:**

- `src/components/breakdowns/card.tsx` — `onGoToSim` prop signature.
- Each breakdown component — pass the seed value.
- Sim panel in `src/components/validator-detail/validator-detail.tsx` — accept
  and apply the seed on mount / when seed changes.

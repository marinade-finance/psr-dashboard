---
status: planned
---

# Simulation pre-fill from breakdown CTAs

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

---
status: planned
---

# CTA family: action + quantified consequence

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

**Bid CTAs must show the concrete current penalty / winning-total / frontier numbers
at minimum in the validator detail panel.** The table pill can stay abbreviated;
the detail Bidding tab must expose the exact SOL penalty and the bid threshold
the validator needs to clear — currently `computeBidPenalty` has the penalty SOL
and `computeInAuctionTarget` / `computeNextEpochStake` have the target pmpe.
Wire these into the Bidding breakdown rows so an operator reading the detail
panel sees numbers, not just the action verb.

**Where:** `src/services/tip-engine.ts` — `bondAdvice()` and the `Losing` branch
(~line 326, route by cause). Bond coverage numbers from `computeBondCoverage`.

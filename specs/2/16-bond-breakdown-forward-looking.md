---
status: planned
---

# Bond breakdown: forward-looking ideal bond for SOFT + growing validators

**Why:** "Ideal bond to grow stake" sizes `requiredIdealKeep` against
`currentExposedStakeSol`. A SOFT validator gaining stake next epoch needs to
pre-fund for the stake that's arriving, not for what they hold today.

**Design call needed:** choose between three options before implementing:

- (a) NEW row alongside existing ideal — current vs projected side-by-side.
- (b) REPLACE current "Ideal" row with projected version when delta > 0,
  revert to current-stake basis at steady state.
- (c) Single row picks `max(current, projected)` — always defensive.

**Where:**

- `src/services/bond-coverage.ts` — add `requiredIdealAtTarget` /
  `topUpToIdealAtTarget` sized against `auctionStake.marinadeSamTargetSol`.
- `src/components/breakdowns/bond-coverage.tsx` — "Ideal bond to grow stake"
  section, only surfaced when positive delta expected.

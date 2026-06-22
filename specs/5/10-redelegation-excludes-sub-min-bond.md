---
status: draft
---

# Redelegation budget should skip sub-min-bond validators

**Why:** the local greedy redelegation pass (`allocateRedelegation` in
`src/services/sam.ts`) walks every validator regardless of
`bondBalanceSol < minBondBalanceSol`. Sub-min-bond validators get allocated
inflow that is then dropped downstream in `computeExpectedStakeChanges`
(sub-min validators are excluded from inflow/rotation). The budget those
validators consumed in the greedy walk is therefore accounted optimistically —
the frontier/rank estimates assume budget went to validators who can't
actually receive it.

## Scope and impact (traced 2026-05-29)

- **Per-validator deltas are already correct** — sub-min inflow is dropped in
  `computeExpectedStakeChanges`, so a validator's own "Next change" is right.
- Only the **priority frontier / rank budget accounting** is optimistic: the
  frontier PMPE may read slightly more favourable than reality because some
  budget is notionally spent on validators who'll be excluded.
- Low user-visible impact; the frontier is already labelled an estimate
  ("verify in Simulate").

## Why it's deferred (blast radius)

`minBondBalanceSol` lives only on `DsSamConfig`, not `AuctionResult`.
`allocateRedelegation` is memoised via `WeakMap<AuctionResult, …>`. To skip
`bondBelowMin(v)` in the greedy walk, the function must also accept
`minBondBalanceSol` and the cache key must become compound — which threads the
param through 4 public selectors into `next-epoch-stake.ts`, `bidding.tsx`,
`sam-table.tsx`, and `validator-detail.tsx`. High blast radius for a
low-impact accuracy gain.

## Fix (when promoted)

Skip `bondBelowMin(v)` validators in the greedy pass before consuming
`remaining`, mirroring the exclusion `computeExpectedStakeChanges` applies.
Thread `minBondBalanceSol` through and make the memoization key compound.

**Where:** `src/services/sam.ts` (`allocateRedelegation`, the WeakMap cache);
`src/services/next-epoch-stake.ts` and the three component call sites.

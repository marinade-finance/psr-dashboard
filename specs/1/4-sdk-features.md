---
status: planned
---

# SDK-level features

Features that depend on upstream `@marinade.finance/ds-sam-sdk` changes or are
currently duplicated between the dashboard and the SDK.

## 1. Move calculations to ds-sam-sdk

**Why:** dashboard math drifts from SDK logic whenever the SDK is updated.
Multiple compute services duplicate SDK internals. The GUIDE claims "every
number comes from the same algorithm Marinade runs on the backend" — currently
false for the three local projection helpers.

**Blocked on:** SDK adding: `export * from './calculations'` in `index.d.ts`,
`expectedStakeChangeSol` on `AuctionValidator`.

**Specific items:**

- `computeBidPenaltyMetrics` (`src/services/bid-penalty.ts`) reimplements
  `calcBidTooLowPenalty` (already in SDK `calculations.js:116` but not
  re-exported). Once exported, drop the local version.
- `computeBondCoverageMetrics` (`src/services/bond-coverage.ts`) reimplements
  bond-coverage math. Stays in the dashboard (dual-basis + top-up amounts), but
  SDK should export the constants it uses.
- `computeExpectedStakeChanges` (`src/services/sam.ts:264`) — per-validator
  stake delta projection. Belongs in SDK as `expectedStakeChangeSol` on
  `AuctionValidator`; once available, drop `augmentAuctionResult` entirely.

**End state:** every `compute*` service in `src/services/` is a thin adapter
over SDK fields — no arithmetic.

## 2. Rank tracking — position history in the dashboard

**Why:** operators need trend direction, not just the current rank snapshot.

**What to track per epoch per validator:** rank, in-set status, SAM-active stake.

**Where to surface:**
- Main table: Δ rank vs previous epoch inline in the Rank cell (`▲3` / `▼1`).
- Validator detail / Overview tab: sparkline or table of last N epoch positions.
- Stats bar: count of validators that moved ≥5 places.

**Data source options (in priority order):**
1. Scoring API response adds a `/history` endpoint.
2. SDK exposes `epoch` on `AuctionResult` → accumulate in a new react-query
   `['epochHistory']` key, keyed by `(voteAccount, epoch)`.
3. `localStorage` session accumulation (fallback — zero infra, limited utility).

## 3. Precise APY from real epoch timestamps

**Why:** `EPOCHS_PER_YEAR = (365.25 × 24 × 3600) / 172800` (theoretical 48h)
overestimates APY during slow epochs and underestimates during fast ones.
Extended validator halts can push real epoch duration ±5%.

**Design:** derive `epochsPerYear` from the observed average over at least 10
epochs using `epoch_start_at` / `epoch_end_at` timestamps already available on
`epoch_stats` per validator in `fetchValidatorsWithEpochs`. Falls back to the
constant if the sample window is too narrow.

**Where:** `src/services/sam.ts` — replace the constant with the derived value.

## 5. Bond override — add to SourceDataOverrides in ds-sam-sdk

**Why:** `AppOverrides` in `src/services/simulation.ts` wraps `SourceDataOverrides` with
an extra `bondBalanceSol: Map<string, number>` because the SDK type has no bond
override path. `sdk-rerun.ts` manually patches `bondBalanceSol` /
`claimableBondBalanceSol` on the cloned validator before calling `Auction.evaluate()`.
This is a workaround — bond is a first-class simulation input and belongs in
`SourceDataOverrides` alongside commissions and bid.

**Blocked on:** SDK adding `bondBalanceSol` to `SourceDataOverrides` and reading it
inside the validator-patch step of `runFinalOnly`.

**End state:** drop `AppOverrides`; use `SourceDataOverrides` directly everywhere.
`sdk-rerun.ts` bond-patch block goes away; `simulation.ts` `AppOverrides` type is deleted.

## 6. RedelegationAllocation — extract to own module, then to SDK

**Why:** `RedelegationAllocation` (the greedy inflow/frontier/rank result) lives in
`src/services/sam.ts` alongside unrelated data-loading and selector logic. The
allocation computation (`allocateRedelegation`) is a pure algorithm that belongs
in the SDK alongside `Auction.evaluate()`.

**Step 1:** extract `RedelegationAllocation`, `allocateRedelegation`, and its
selectors (`selectRedelegationBudget`, `selectRedelegationPriorityFrontierPmpe`,
`selectRedelegationPriorityRank`) into `src/services/redelegation.ts`.

**Step 2 (SDK):** move the algorithm to `ds-sam-sdk` once the SDK exposes the
greedy allocation as a named export; drop the local copy.

## 4. PSR estimate query — share all-validator fetch across detail opens

**Why:** `fetchPsrEstimatesForValidator` fetches all validators (3 epochs) and
filters client-side. The react-query key is `['psrEstimates', voteAccount]` so
opening N detail sheets makes N full `fetchValidatorsWithEpochs(3)` calls.

**Fix:** split into two cached queries:
1. `['psrEstimatesAll']` — fetches all validators, runs
   `calculateProtectedEventEstimates`, `staleTime: 5 min`.
2. Per-validator filter runs client-side from the cached result.

**Where:** `src/services/protected-events-estimator.ts:348`.

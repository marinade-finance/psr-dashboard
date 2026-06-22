---
status: planned
---

# Move calculations to ds-sam-sdk

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

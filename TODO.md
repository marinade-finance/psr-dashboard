# TODO

## Features

### 1. Move calculations to ds-sam-sdk

Several computations currently duplicated in the dashboard should be upstreamed to the SDK:

- **`computeBidPenaltyMetrics`** (`src/services/breakdowns.ts:251`) — reimplements `calcBidTooLowPenalty` from
  `calculations.js:117`. Uses SDK-internal constants `TOL_COEF = 0.99999` and `SCALE_COEF = 1.5` that ideally
  should be exported from the SDK.
- **`computeBondCoverageMetrics`** (`src/services/breakdowns.ts:105`) — reimplements bond coverage math using
  `minBondPmpe`, `idealBondPmpe`, `minUnprotectedReserve`, `idealUnprotectedReserve`. Logic mirrors internal
  fee-trigger conditions in the SDK.
- **`computeExpectedStakeChanges`** (`src/services/sam.ts:251`) — dashboard-side projection of per-validator
  stake delta next epoch. Uses `selectRedelegationBudget` (undeployed TVL) and `computeNaturalWithdrawal`
  (~0.7%/epoch). This is the authoritative model of what the on-chain crank will do; belongs in the SDK.
- Expose `expectedStakeChangeSol` per validator directly from `AuctionResult` / `AuctionValidator` in the SDK
  rather than requiring consumers to re-derive it.

**Why:** Dashboard math drifts from SDK logic when SDK is updated. Centralising it means one source of truth and
easier testing at the SDK level.


### 2. Rank tracking — surface position history in the dashboard

Add per-validator rank history so that the table and detail view can show position movement over recent epochs.

**What to track:**
- Rank (position in auction) per epoch per validator
- In-set / out-of-set status per epoch
- SAM-active stake per epoch

**Dashboard surface points:**
- Main table: show Δ rank vs previous epoch inline in the Rank cell (e.g. `▲3` / `▼1`)
- Validator detail / Overview tab: small sparkline or table of last N epoch positions
- Stats bar: count of validators that moved ≥5 places this epoch

**Implementation sketch:**
- Store snapshots in the scoring API response or a new `/history` endpoint, or accumulate in a lightweight
  client-side store keyed by `(voteAccount, epoch)`
- SDK should expose `epoch` on `AuctionResult` so the dashboard can key snapshots correctly
- If API support is unavailable, accumulate in `localStorage` within a session (limited utility but zero infra)

**Why:** Operators want to know whether they're trending up or down, not just their current rank. Without history
the rank number is hard to interpret.

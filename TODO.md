# TODO

## Features

### 1. Move calculations to ds-sam-sdk

Several computations currently duplicated in the dashboard should be upstreamed to the SDK.

**SDK version audited: 0.0.48** (`calculations.d.ts` not re-exported from `index.d.ts` — functions listed
below as "not exported" are compiled into SDK but inaccessible to consumers without an SDK change.)

- **`computeBidPenaltyMetrics`** (`src/services/breakdowns.ts:251`) — reimplements `calcBidTooLowPenalty`
  from `calculations.js:116`. SDK function exists and is exported from `calculations.d.ts` but **not
  re-exported** from the SDK `index.d.ts`. Dashboard hardcodes `TOL_COEF = 0.99999` and `SCALE_COEF = 1.5`
  which are SDK-internal locals. To fix: add `export * from './calculations'` to the SDK index, then
  call `calcBidTooLowPenalty` directly and drop the local reimplementation.

- **`computeBondCoverageMetrics`** (`src/services/breakdowns.ts:114`) — reimplements bond coverage math
  using `minBondPmpe`, `idealBondPmpe`, `minUnprotectedReserve`, `idealUnprotectedReserve` (all present on
  `AuctionValidator`). Logic mirrors the SDK's `calcBondRiskFee` fee-trigger conditions. `calcBondRiskFee` is
  exported from `calculations.d.ts` but not from the SDK index. This function does more than the SDK primitive
  (dual current/projected basis, top-up amounts) so it probably stays in the dashboard; but the SDK should
  at minimum export the constants it depends on.

- **`computeExpectedStakeChanges`** (`src/services/sam.ts:264`) — dashboard-side projection of per-validator
  stake delta next epoch. Uses `selectRedelegationBudget` (TVL − Σactive) and `computeNaturalWithdrawal`
  (~0.7%/epoch). `AuctionValidator` has no `expectedStakeChangeSol` field in SDK 0.0.48.
  This is the authoritative crank model; belongs in the SDK. To fix: SDK should compute and expose
  `expectedStakeChangeSol` per `AuctionValidator` so the dashboard drops `augmentAuctionResult` entirely.

**Why:** Dashboard math drifts from SDK logic when SDK is updated. Centralising means one source of truth and
easier testing at the SDK level.

**Blocked on:** SDK changes (export calculations index, add `expectedStakeChangeSol` to `AuctionValidator`).


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


### 3. Precise APY annualization from real epoch timestamps

`sam.ts` currently uses `EPOCHS_PER_YEAR = (365.25 * 24 * 3600) / 172800` (theoretical: 432000 slots × 0.4 s/slot = 48 h exactly). In practice Solana epochs drift from the theoretical duration due to missed slots, validator halts, etc.

**What to do:**
- Fetch the last N epoch `epoch_start_at` / `epoch_end_at` timestamps from the validators API (already available on `epoch_stats` per validator in `fetchValidatorsWithEpochs`).
- Derive `epochsPerYear` from the observed average epoch duration over the sample window instead of the constant.
- This was previously implemented as `estimateEpochsPerYear` but removed in favour of the simpler constant. The constant is correct within ~0.1% in normal conditions, but diverges during extended outages.

**Acceptance criteria:**
- `epochsPerYear` is derived from at least 10 real epochs rather than the slot-time constant.
- Falls back to the constant if timestamp data is missing or the sample window is too narrow.
- APY numbers in the table and breakdown shift accordingly.

**Why:** The constant overestimates APY during slow epochs and underestimates during fast ones. Operators making bonding decisions benefit from accurate compound-rate math.


### 4. PSR estimate query: share all-validator fetch across detail sheet opens

`fetchPsrEstimatesForValidator` (`protected-events-estimator.ts:348`) fetches all validators (3 epochs) and filters client-side for one. The react-query key is `['psrEstimates', voteAccount]` — per-validator — so opening 5 different detail sheets makes 5 full `fetchValidatorsWithEpochs(3)` calls with no data reuse.

**Fix:** Split into two cached queries:
1. `['psrEstimatesAll']` — fetches all validators and runs `calculateProtectedEventEstimates`, `staleTime: 5 min`
2. Per-validator filter runs client-side from the cached result

Opening N detail sheets in a session then costs 1 fetch instead of N.

**Why:** Browsing multiple validators in a session makes redundant API calls proportional to the number of sheets opened.

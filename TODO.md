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

---

## PSR Settlement Pending Status

PSR settlements stamped in the auction but not yet written on-chain need
a **PENDING** status (distinct from current ESTIMATE). Today everything
auction-emitted shows as ESTIMATE; the protected-events table cannot
distinguish "settlement is final but not yet claimed on-chain" from
"this is just a projection."

**Where:** `src/services/validator-with-protected_event.ts` — gate
between `ESTIMATE` (current epoch projection) and a new `PENDING`
(emitted/settled in the auction, on-chain claim not yet visible).
Surface as a third badge color in `protected-events-table.tsx`.

Three states total:

- **ESTIMATE** — current-epoch projection, accent color (existing)
- **PENDING** — auction-emitted, not yet on-chain, accent color (new)
- **FINALIZED** — on-chain settlement done, muted/neutral badge (no
  accent, but should still show a label so every row has a status)

## Epoch Status Badge

Add an epoch status indicator that explains where the network is in
the current epoch's lifecycle:

- **Progress bar** for the current epoch (slot / 432000)
- **Pending epoch**: the prior epoch is finalized or still settling
- **Finalized**: prior epoch's on-chain claims done
- **Next auction epoch**: which epoch the next auction will run for

Place it in the SAM page header / stats bar so users can tell at a
glance how mature the displayed auction snapshot is.

## Investigate: drop CPMPE term

GUIDE.md currently defines CPMPE as "cost per 1000 SOL per epoch":

> **CPMPE** — *cost* per 1000 SOL per epoch. The validator's static bid
> component: a fixed amount the validator pays out of their bond for
> every 1000 SOL of stake they receive, every epoch.

Hypothesis: the "C" prefix adds no information for readers — the term
"static bid (PMPE)" or just **cost** already communicates the same
thing. Internally we use `cpmpe` in fixtures, simulation overrides,
bonds, and the GUIDE; column header in `sam.ts:132` says 'CPMPE'.

**Investigate:**
- Is there any place where C-PMPE meaningfully contrasts with plain PMPE?
- Could we rename to just "cost" or "static bid (PMPE)" in user copy,
  keeping `cpmpe` only as the internal identifier?
- What does the SDK use? (likely also `cpmpe` — but UI labels are ours)

Ask the oracle for a second opinion before changing user-facing copy.
(Oracle attempt 2026-05-13 hit the usage limit — retry after May 17.)

**My own take pending oracle:** the C-prefix probably IS load-bearing
because the validator side of the auction reads revenue PMPE and cost
PMPE side-by-side. A unitless "cost" loses the dimensional anchor
("per 1000 SOL per epoch") that lets a reader compare it directly
against the inflation/MEV/block PMPE breakdown numbers. Better gloss
might be: keep the term, expand the definition so it foregrounds the
unit relationship — e.g. "**CPMPE** — same unit as PMPE, but
representing what you pay rather than what you earn."

References:
- `public/docs/GUIDE.md` lines 128-142 (CPMPE definition)
- `src/services/sam.ts:132` ('CPMPE' column header string)
- `src/services/bonds.ts:9` (cpmpe field)
- `src/services/simulation.ts:173-204` (cpmpesDec map)
- `src/fixtures/test-bonds.ts:28-105` (test fixture comments)

## Verify: 0.7% natural turnover framing

`src/services/sam.ts:209` calls `WITHDRAWAL_FRACTION_PER_EPOCH = 0.007`
and comments it as "0.7% of TVL is withdrawn from the pool each epoch
by redeemers." This may be wrong: the 0.7% is the natural-redelegation
turnover cap, not specifically an mSOL redemption rate. The model
treats it as net outflow (pulls stake from over-target validators), but
if it's actually a redelegation cap, total stake shouldn't drop —
just redistribute.

GUIDE.md was updated 2026-05-13 to drop the mSOL-redemption framing
and defer to Marinade docs. Confirm what 0.7% actually represents in
the SDK / SAM design and adjust either the model in `computeNaturalWithdrawal`
or the comment in `sam.ts:209`.

## Feature: "My Validator" address pin + personal notification ribbon

Let a validator save their vote account in the browser and surface
notifications addressed to that account at the top of every page.

**UX:**
- Small input in the navigation (or a header chip) where the validator
  pastes/types their vote account. Validation: the account must exist
  in the current auction data; otherwise show "not found".
- Stored in `localStorage` keyed by something like `mnde:myValidator`.
  No server-side state.
- Once set, a slim ribbon appears at the top of every page (above the
  banner) showing the notifications whose `user_id` matches the saved
  vote account. Each notification: priority chip + title + message,
  optional dismiss-this-one button.
- "Clear" button on the chip to forget the saved account.

**Data:** already fetched. `fetchAllNotifications()` returns a
`Record<user_id, NotificationSummary>` — just look up by the saved
vote account. No new endpoint needed. Re-uses the existing 5-min
refresh interval.

**Where:**
- `src/components/navigation/navigation.tsx` — input/chip.
- New component: `src/components/my-validator-ribbon/` — renders the
  notification list when an address is set and matches.
- Pages mount the ribbon between `<Navigation>` and the broadcast
  `<Banner>` (or just below).

**Considerations:**
- Persist priority across sessions; clear on "forget".
- If the saved vote account isn't in the current auction snapshot,
  still show notifications matching it (the user_id index is stable),
  but mark the chip muted ("not in current auction").
- Mobile: collapse the input into a small icon that expands a popover.

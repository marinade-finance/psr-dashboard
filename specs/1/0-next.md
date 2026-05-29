---
status: planned
---

# Next to ship

All open spec items consolidated into one phase file. Each section is one
named item: WHY + acceptance / code pointers. Shipped predecessors trimmed
or moved to `specs/archive/`.

---

## Remove `/expert-*` routes

**Why:** Expert mode is deprecated. `/expert-`, `/expert-bonds`,
`/expert-protected-events`, `/expert-docs` still resolve in
`src/index.tsx` but are undocumented (no row in `README.md`,
`ARCHITECTURE.md`, or `SCREENS.md` route tables) and no Playwright test
hits them. The `level: UserLevel` prop drives a Basic-vs-Expert column
gating inside each page; once routes are dropped, that prop and the
expert-only columns/metrics go too.

**End state:** `createBrowserRouter` only registers `/`, `/bonds`,
`/protected-events`, `/docs`, and the `/test-*` sandbox. `UserLevel` is
removed; pages drop the `level` prop. `public/docs/GUIDE-EXPERT.md`
already deleted.

**Where:** `src/index.tsx`, `src/pages/*`, `src/components/navigation/`,
every page that imports `UserLevel`.

---

## Test-page parity — /test- data path may diverge silently

**Why:** `/test-` routes wrap the same page components, so UI logic can't
silently diverge. What CAN diverge is the `loadAuction` / `loadNotifications`
implementation inside each test page — those are local reimplementations of the
real data loaders, not imports of them.

Specific risk: `src/pages/test-stake-auction-marketplace.tsx` has a
`hasOverrides` branch (skip SDK rerun when no overrides active) that exists only
in the test page — the main page never exercises it. A bug in that branch won't
be caught.

**Three options (pick one):**

1. Make `SamDataSources.loadAuction` in the test page a thin wrapper around the
   same `loadSam()` factory the main page uses, with fixture data injected.
   No bespoke branching.
2. Add a Playwright test hitting `/` against a locally-seeded server — proves
   the main page data path is alive.
3. Extract "skip rerun when no overrides" into a shared helper
   (`maybeRerun(overrides, base, rerunFn)`) imported by both pages — then the
   branch is covered wherever the test page is tested.

**Where:** `src/pages/test-stake-auction-marketplace.tsx`,
`src/pages/stake-auction-marketplace.tsx`.

---

## Move `assertNever` into ts-common

`src/utils/assert-never.ts` is a one-function module (exhaustiveness helper).
It has no project-specific dependencies and is the kind of primitive that belongs
in a shared `@marinade.finance/ts-common` (or equivalent) package alongside other
zero-dep utilities used across the monorepo.

**Where:** `src/utils/assert-never.ts`.

**When:** whenever `ts-common` (or the equivalent shared-utils package) is being
assembled or a multi-repo audit finds this duplicated elsewhere.

---

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

**Bid CTAs must show the concrete current penalty / winning-total / frontier numbers
at minimum in the validator detail panel.** The table pill can stay abbreviated;
the detail Bidding tab must expose the exact SOL penalty and the bid threshold
the validator needs to clear — currently `computeBidPenalty` has the penalty SOL
and `computeInAuctionTarget` / `computeNextEpochStake` have the target pmpe.
Wire these into the Bidding breakdown rows so an operator reading the detail
panel sees numbers, not just the action verb.

**Where:** `src/services/tip-engine.ts` — `bondAdvice()` and the `Losing` branch
(~line 326, route by cause). Bond coverage numbers from `computeBondCoverage`.

---

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

---

## Test fixtures — full /test- CTA and auction-state coverage

**Why:** `/test-` runs the REAL `DsSamSDK` auction over
`src/fixtures/test-validators.ts`, so most CTA states are emergent from the
auction result — they cannot be set per field. The current fixture population
does not produce every region, so Playwright snapshots miss entire code paths.

### Why "B-frozen" (real snapshot) beats a hand-crafted population

A hand-crafted population (Option A) requires modelling the full auction
interactions — country/ASO caps, multiple winning bands, natural-withdrawal
budget — which is re-implementing the SDK. A pruned real snapshot (Option B) is
realistic, already exercised by the SDK, and deterministic once frozen.

Capture from the live data source (`loadSam` / `fetchValidatorsWithEpochs`),
freeze as a static fixture, prune to a representative subset (~30–50 rows), tune
a few edge rows.

### Auction conditions the fixture must produce

- **Non-zero redelegation budget** — `selectRedelegationBudget > 0`. Total TVL
  must exceed Σ active stake; without this, "gain stake / keep stake" CTAs and
  `computeInAuctionTarget` / `computeNextEpochStake` are untestable.
- **Clearing cutoff** with clear winners AND losers — rank ±N, the out-of-set
  "bid too low" block, and "losing stake next epoch" all arise.
- **Country / ASO cap hit** — enough validators sharing one country / ASO.
- **Bond tiers** — at least one row per tier: healthy / soft / watch / critical /
  no-bond; at least one row with `bondRiskFeeSol > 0`; one with
  `topUpToAvoidFee > 0`; one with `carriedPaidUndelegationSol > 0`.
- **claimable < gross bond** — at least one row where `claimableBondBalanceSol`
  differs from `bondBalanceSol`.

### Row variation required

Each fixture row must vary: `cpmpe`, bond balance, active stake, paid
undelegation, and claimable-bond vs gross-bond.

### Constraints

Write only `src/fixtures/test-validators.ts` (and `src/fixtures/test-bonds.ts`
if the bonds page needs parallel coverage). Fixture objects must satisfy the
existing `AggregatedValidator`-derived types exactly. Verify with
`pnpm build && pnpm preview` → open `/test-` and audit which CTA / auction
state each named row surfaces.

---

## Move calculations to ds-sam-sdk

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

---

## Rank tracking — position history in the dashboard

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

---

## Precise APY from real epoch timestamps

**Why:** `EPOCHS_PER_YEAR = (365.25 × 24 × 3600) / 172800` (theoretical 48h)
overestimates APY during slow epochs and underestimates during fast ones.
Extended validator halts can push real epoch duration ±5%.

**Design:** derive `epochsPerYear` from the observed average over at least 10
epochs using `epoch_start_at` / `epoch_end_at` timestamps already available on
`epoch_stats` per validator in `fetchValidatorsWithEpochs`. Falls back to the
constant if the sample window is too narrow.

**Where:** `src/services/sam.ts` — replace the constant with the derived value.

---

## Bond override — add to SourceDataOverrides in ds-sam-sdk

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

---

## RedelegationAllocation — extract to own module, then to SDK

**Why:** `RedelegationAllocation` (the greedy inflow/frontier/rank result) lives in
`src/services/sam.ts` alongside unrelated data-loading and selector logic. The
allocation computation (`allocateRedelegation`) is a pure algorithm that belongs
in the SDK alongside `Auction.evaluate()`.

**Step 1:** extract `RedelegationAllocation`, `allocateRedelegation`, and its
selectors (`selectRedelegationBudget`, `selectRedelegationPriorityFrontierPmpe`,
`selectRedelegationPriorityRank`) into `src/services/redelegation.ts`.

**Step 2 (SDK):** move the algorithm to `ds-sam-sdk` once the SDK exposes the
greedy allocation as a named export; drop the local copy.

---

## Blacklist metadata — epoch and reason

**Why:** the CTA for a blacklisted validator currently says "Blacklisted." with no
context about when it happened. Operators want to see the epoch at which the blacklist
took effect so they know whether to escalate.

**Blocked on:** `AggregatedData.blacklist` is `Set<string>` — no epoch metadata.
Needs the SDK or scoring API to emit `{ voteAccount, blacklistedSinceEpoch }`.

**End state:** CTA reads "Blacklisted since epoch {N}." / "Blacklisted since epoch {N}
— {penalty} penalty this epoch."

---

## Upstream package fixes required

### `@marinade.finance/eslint-config` — update eslint-plugin-import

`eslint-plugin-import@2.x` uses `sourceCode.getTokenOrCommentAfter` which was removed in ESLint 10. The shared config bundles this plugin; the dashboard pins `eslint@10.4.0`. Workaround: local `eslint.config.cjs` sets `'import/order': 'off'`.

**Fix:** bump `@marinade.finance/eslint-config` to use `eslint-plugin-import-x` (the ESLint-10-compatible fork) in place of `eslint-plugin-import`. Then remove the local `import/order: off` workaround.

### `@marinade.finance/eslint-config` (or project) — add `@zodios/core`

The generated Zod schemas in `src/schemas/generated/` import from `@zodios/core`.
`@zodios/core@10.9.6` is installed.

---

## PSR Settlement Pending Status

**Why:** everything auction-emitted shows as ESTIMATE today; the table cannot
distinguish "settlement final, on-chain claim not yet visible" from
"current-epoch projection."

Three states total:

- **ESTIMATE** — current-epoch projection (existing).
- **PENDING** — auction-emitted / settled, on-chain claim not yet visible (new).
- **FINALIZED** — on-chain settlement done, muted badge (existing label, needs
  explicit rendering even when muted so every row has a status).

**Where:**

- `src/services/validator-with-protected_event.ts` — gate between ESTIMATE and
  PENDING based on auction emit flag.
- `src/components/protected-events-table/` — third badge colour for PENDING.

---

## "My Validator" address pin + personal notification ribbon

**Why:** validators want their own notifications surfaced without having to find
their row in the table.

**UX:**

- Input in the navigation where the validator pastes their vote account.
  Validation: account must exist in current auction data or still show
  notifications if not in auction (chip marked muted).
- `localStorage` key `mnde:myValidator`. No server state.
- A slim ribbon above the broadcast `<Banner>` on every page showing
  notifications matching the saved vote account. Each row: priority chip +
  title + message + optional dismiss.
- "Clear" button on the chip.

**Data:** `fetchAllNotifications()` already returns
`Record<user_id, NotificationSummary>` — look up by saved vote account. No new
endpoint. Reuses the 5-min refresh.

**Where:**

- `src/components/navigation/navigation.tsx` — input/chip.
- New `src/components/my-validator-ribbon/` — renders the notification list.
- Pages mount ribbon between `<Navigation>` and `<Banner>`.

---

## Bond breakdown: forward-looking ideal bond for SOFT + growing validators

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

---

## Notifications grouped by epoch

**Why:** the Notifications tab lists PSR events in order, but when there are
many events spanning multiple epochs the list loses context — which events are
from the current epoch vs older epochs?

**What:** group notification rows by epoch number, with a sticky epoch header
separating each group. Most-recent epoch at the top.

**Where:**
- `src/components/validator-detail/` — the Notifications tab list renderer.

**Open questions:**
- Epoch header design: inline divider vs collapsible group?
- How many epochs to show before truncating (pagination or "show more").

---

## Responsive layout

**Why:** on narrow screens (< 900px) the app layout is dense and some elements
overlap or clip. Not a mobile target (mobile shows unsupported banner below
640px), but laptop/tablet users in a split-pane or narrow window need a
better experience.

**Known issues:**
- Validator detail sheet: `sticky top-[68px]` tab strip assumes the global nav
  is 68px — needs re-validation after the sheet gained `top-4` inset margin
  (commit c7cd8840). The sticky offset should reference the sheet's own header
  height, not the page nav height.
- General: audit all fixed px offsets in sticky elements for correctness at
  various viewport widths.

**Key files:** `src/components/validator-detail/validator-detail.tsx` (TabStrip),
`src/components/ui/sheet.tsx` (inset geometry).

---

## GUIDE gaps from validator support transcript (2026-04 to 05)

**Why:** real support threads showed validators confused by five specific gaps.
Each maps to a concrete doc addition or UI label.

| #   | Gap                                                                | Fix                                                                                              |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Negative `Cover. [ep]` (e.g. "-9")                                 | GUIDE: negative = below fee threshold, undelegation in flight                                    |
| 2   | BRRM (Bond Risk Reduction Mechanism)                               | Add BRRM section to GUIDE with link to Marinade docs; clarify fee + stake drop are one mechanism |
| 3   | Snapshot timing — when does auction run, when does a top-up count? | "Epoch lifecycle" subsection in GUIDE (overlaps with Epoch Status Badge)                         |
| 4   | Top-up sized to projected stake, not current                       | Dashboard: label recommendation with stake basis; GUIDE: explain the sizing                      |
| 5   | Bid reduction safe-zone                                            | GUIDE: one sentence — "reducing your bid is safe as long as you remain above the clearing price" |

Items 1–3 and 5 are pure GUIDE prose additions. Item 4 needs a UI label in the
bond breakdown AND a GUIDE explanation.

**Where:** `public/docs/GUIDE.md`, `src/components/breakdowns/bond-coverage.tsx`
(item 4 label).

---

## Docs hygiene: ≤120-char line length

**Why:** CLAUDE.md wisdom rule says prose lines ≤120 chars; several root docs
and `public/docs/GUIDE.md` have lines 200+ chars (the "Data Sources" table,
participation-requirements bullet, long-URL rows).

**Scope:** `public/docs/GUIDE.md`, `SCREENS.md`, `VISUALS.md`,
`ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `bugs.md`.

**Rules:** wrap prose at ≤120 chars; don't break mid-link or mid-codespan.
Markdown tables with long URLs: use footnote references or accept the table as
the documented exception. Don't reformat code blocks.

---

## Bond Calculator

**Why:** validators ask how to determine the bid and bond required to obtain stake.
Because SAM is a last-price auction, the required bid varies by epoch
depending on competition. Minimal bond is tricky to reason about: more bond
can be staked, and once stake is obtained the excess bond can be withdrawn.

### Solution

Add a bond calculator that lets validators input parameters and see:

1. **Minimum bid** — estimated clearing price based on recent auction history
2. **Minimum bond** — the bond floor needed to cover the stake they'd receive
   at that bid, given current `bondBalanceSol` requirements
3. **Recommended bond** — a safer amount accounting for variance across epochs
4. **Withdraw-after-stake flow** — show how much bond becomes withdrawable
   once stake is assigned (bond posted minus bond required for received stake)

### UX

- Accessible from the SAM auction page (inline or linked panel)
- Inputs: desired stake amount (SOL), validator vote account (optional,
  to prefill current bond/commission)
- Outputs: recommended bid, required bond, expected stake, withdrawable
  surplus after assignment
- Show historical clearing prices for context (last N epochs)

### Technical Notes

- Use `ds-sam-sdk` auction data to derive recent effective bids
- Bond requirement = f(stake_received, validator_params) — extract from
  SDK or replicate logic
- Consider a sensitivity sweep: "if you bid X, you'd have won in Y of
  last Z epochs"

---

## SAM stats bar — combined-metric tiles (rolled back, retry)

**Status:** rolled back 2026-05-16 (commit reverting `4d6aac6a`).

The original `4d6aac6a` commit collapsed Winning APY + Projected APY into a
single tile with a `text-[10px]` muted "projected N%" subline, and gave
Re-delegation a "X% of SAM TVL" subline. Net effect: 5 tiles → 4.

The visual didn't land. The subline reads as a typographic afterthought
against the much-larger primary value, the two-number-per-tile rhythm
breaks the otherwise uniform stat row, and the "projected" label is
lost under the dominant Winning figure. Reverted; 5 separate tiles
restored. New order, top-down, by user importance:

1. Re-delegation
2. Winning APY
3. Projected APY
4. Winning Validators
5. Total Auction Stake

### What to try next time

A redesign of the stats row that genuinely conveys related-pair metrics
without sacrificing scannability:

- Two-tile group with a hairline divider — explicit "these belong
  together" container, both numbers at the same primary weight.
- Or a small inline pill on the primary metric that links to the
  paired one (e.g. Winning APY tile carries a `Projected →` chip that
  scrolls/highlights the Projected tile).
- For the "% of TVL" share — surface it in the tile's HelpTip rather
  than in the chrome. The HelpTip is exactly the affordance for "where
  does this number sit in the context of the whole?".

Reference commit: `4d6aac6a [sam-table] merge Winning+Projected APY,
add Re-delegation TVL share`. Reference revert: see the commit titled
`[sam-table] revert merged APY tile, swap Re-delegation to first`.

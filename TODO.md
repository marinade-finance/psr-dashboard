# TODO

## Queued — fix on a clean tree, verify, then commit

### Rounding / decimal-places rule across breakdowns

- **BOND balances → 1 decimal place** (currently 3-dp via `cost()`).
- **Payments → 3 decimal places**.
- **Stake → whole numbers**.
- **Top-up suggestions → round UP** (never under-recommend).
- **Balances rendered → round DOWN** (never over-state what you have).
Implement as dedicated formatters in `src/format.ts` (e.g. `bondSol()`
1-dp rounded-down, `topUpSol()` whole/1-dp rounded-up) and switch the
breakdown call sites; do NOT just change `cost()` semantics — used
elsewhere.

### "Your cost-PMPE today" → rename in bidding breakdown

The section header on the bidding breakdown reads "Your cost-PMPE today";
user prefers "Your bid today" (or similar). Small copy edit in
`bidding.tsx`'s first SectionHeader.

### Total/SectionHeader margins — Total overshadows the next header

`row.tsx`: `TOTAL_CELL_PAD = 'pt-4 pb-2'` competes with the next
`SectionHeader` (`pt-4 pb-1`). Reduce Total's top padding and bump
SectionHeader's top padding ~10% so the section break reads cleaner.

### Gauge 20% marker ≠ the actual fee threshold (semantic gap)

The current `bondCriticalFrac = 0.2` is a chosen **visual anchor**, NOT
the SDK's fee-charged threshold. Real fee fires at runway <
`minBondEpochs` (1 epoch). On `scaleMax = 4 × idealBondEpochs` (= 52),
the true threshold sits at 1/52 ≈ **2 %** of the bar — the old sliver.
The two requirements (full at 4×ideal AND marker at actual fee point)
genuinely conflict; current code keeps the 20% for visibility at the
cost of literal-truth. Decide: keep 20% (visual prominence, not
literally where the fee fires) OR change `scaleMax = 5 ×
minBondEpochs` (marker really IS at the fee threshold, full-scale
becomes much smaller, healthy validators saturate fast).

### Simulation-mode round band must wrap the broadcast banner too

The yellow "SIMULATION MODE" frame currently surrounds the SAM table
but not the announcement banner above it; if the banner is present, the
frame should include it (it's part of the simulated view). Wherever the
sim-mode wrapper lives, the banner must be inside it.

### `/test-` has no working simulation (page wrapper limitation)

`test-stake-auction-marketplace.tsx`'s `loadAuction` returns the frozen
`SAM_RESULT` — no `runFinalOnly` is wired, so simulation edits don't
recalculate. Minimal orthogonal fix: have the test page accept a
`SourceDataOverrides` and apply a pure deterministic transform to the
frozen fixture (no SDK rerun) — overrides modify `cpmpe` /
commissions / `revShare` on the matching fixture validator, the rest
of the page reads the modified copy. Captures every override-driven
state visually without a live auction.

### Tooltip — single sticky + click-anywhere dismiss; use a standard primitive

Current `HelpTip` pin/hover is custom state with an `onPointerDown`
blink-fix workaround. The user wants: only ONE tooltip pinned at a
time globally; clicking anywhere outside dismisses the pinned one.
Standard primitive: Radix `Popover` for the click-to-pin (built-in
click-outside + Esc), Radix `Tooltip` for the hover preview, composed.
Don't reinvent. Cross-component pin-singleton can be a module-level
"currently pinned id" registry the HelpTip subscribes to.

### "Binding cap — <voteAccount> is full" CTA is wrong + add to /test-

The cap-constraint CTA reads "Binding cap — A11pG…tS5 is full" — wrong
framing AND it should NOT include the vote account. Reword (no vote
account; clearer than "is full"). This is the VALIDATOR/COUNTRY/ASO
cap-constraint path of the "handle all 6 SDK constraint types" item.
`/test-` exercises none of these cap states — add fixture rows
(per-validator cap, country cap, ASO cap) so each renders.

### avoid-fee CTA fires when NO fee is charged (real bug)

`bondAdvice` (`tip-engine.ts:161`) and `outOfSetTip` (`tip-engine.ts`
below-min branch) emit "Top up N SOL to avoid the bond risk fee."
whenever `coverage.topUpToAvoidFee > 0`. But `topUpToAvoidFee`
(`bond-coverage.ts:126`) = `max(0, floorBaseProjected − claimableBond)`
— only "claimable below the projected floor", NOT "a fee is charged".
A below-min / out-of-set / target-0 row with `bondRiskFeeSol === 0`
(Payments shows "No penalties") still gets the avoid-fee CTA + the
octagon `alert` escalation — false/misleading. Fix: gate the avoid-fee
text AND `alert: true` on an ACTUAL fee (`bondRiskFeeSol > 0`, or the
real SDK fee-trigger), not on `topUpToAvoidFee > 0`; when no fee,
fall to the below-min "post / top up bond to win stake" message.
Blocked: the consolidation sub owns `tip-engine.ts`. Verify a no-fee
below-min row shows NO "avoid the fee" and NO octagon.

### Breakdown tables — uniform 3-col model

Every breakdown table (`bond-coverage`, `bidding`, `payments`, `bid-penalty`)
must use ONE shared component (merge `CalcRow`+`RevRow`): `Label | Col1 | Col2`.
- A column NEVER mixes value kinds (today they mix epochs/stake-SOL/bond-SOL/PMPE/rank/% in one column).
- PMPE / epochs / other named units → declared as the column unit in `SectionHeader`; value carries no suffix.
- SOL → inline `SOL` suffix on the value, NEVER a header.
- % → inline annotation beside its value, NEVER a header.
- So `SectionHeader` only ever declares non-SOL, non-% units.
- Captions/labels: leave as-is (user reviews next). Do NOT invent values — map 1:1 to existing fields.
- All tables share the SAME component + visual elements (uniform).

### Bond pill gauge — critical band must be a FIXED 20%

Regression: `marker`/`criticalBand` were derived as `minBondEpochs/scaleMax`;
with `scaleMax = 4×idealBondEpochs` and the realistic `idealBondEpochs=13`,
that is `1/52 ≈ 2%` — the danger zone collapsed to a sliver again.
Fix: `marker = criticalBand = 0.2` (FIXED, decoupled from scale — it's a
visual anchor, not a derived value). `scaleMax = 4×idealBondEpochs` and the
runway fill stay as the independent axis. (`sam-table.tsx` ~bond Gauge call.)

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

**Forward-looking projections also belong in the SDK.** Today the dashboard
maintains three projection helpers that are NOT auction outputs but are
derived locally from auction state:

- `computeInAuctionTarget` (`src/services/in-auction-target.ts`) — closed-form
  bid that would clear `winningTotalPmpe + bond floor`. Tagged "estimate,
  verify in Simulate" because the last-price coupling means adding/growing
  this winner shifts the clearing price.
- `computeNextEpochStake` (`src/services/next-epoch-stake.ts`) — heuristic
  bid to clear the redelegation priority frontier; surfaces `priorityRank`
  and `bidGapPmpe`. Built on the local greedy `allocateRedelegation` in
  `sam.ts` which does NOT enforce country/ASO/validator caps (the SDK does
  during `evaluate()` — see bugs.md #7).
- `computeBidPenalty` (`src/services/bid-penalty.ts`) — pedagogical recompute
  of the bid-too-low penalty. The local recompute diverges from the SDK's
  `revShare.bidTooLowPenaltyPmpe` on synthetic fixtures; sessions have been
  spent reconciling the two surfaces ([[concepts-audit]] §2 — "Penalty this
  epoch" label divergence).

The GUIDE.md prose claims "every number comes from the same algorithm
Marinade runs on the backend" — currently a lie because of these three
projections. The user-visible cost is: every UI label that surfaces a
projection has to be tagged "estimate, verify in Simulate", and bug-hunt
agents repeatedly find subtle divergences between the local projection and
the SDK's actual behaviour after a rerun. Upstream solution: the SDK should
expose its own projection helpers (or a "what-if" evaluation path) so the
dashboard becomes a pure rendering layer over SDK outputs.

**End-state goal:** the dashboard imports `@marinade.finance/ds-sam-sdk`,
calls it for every number it displays (including projections and
simulation reruns), and contains zero arithmetic of its own. Every
`compute*` service in `src/services/` is then a thin adapter that selects
SDK fields and formats them — no math.


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

## GUIDE gaps surfaced by validator support transcript (2026-04 to 05)

Real support thread showed a validator confused by:

1. **Negative `Cover. [ep]`** ("= -9") — what it means physically and
   what action it implies. Column shows the value but the GUIDE doesn't
   explain that negative = under the fee threshold and the undelegation
   is in flight.
2. **BRRM** (Bond Risk Reduction Mechanism) — the validator googled
   it and found the Marinade doc. We name only its component "Bond
   Risk Fee"; the broader BRRM (fee + forced paid undelegation in the
   same step) is unnamed. Add a short BRRM section linking to
   `https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-risk-reduction-mechanism`
   and clarify that the fee + the stake drop are one mechanism, not two.
3. **Snapshot timing** — when does the auction actually run within an
   epoch? When does a bond top-up start counting? Validators ask these
   on every support ticket. Should sit in a small "Epoch lifecycle"
   subsection (overlaps with the existing Epoch Status Badge TODO).
5. **Top-up amounts are sized to projected stake, not current stake**
   — the dashboard's "Top up 29 SOL" recommendation in the transcript
   was sized against the *post-undelegation* stake (171k SOL), but the
   validator read it as "29 SOL to keep my current 386k SOL stake".
   Either the dashboard should label the recommendation with which
   stake basis it's for, or the GUIDE should explain that the top-up
   keeps the *new* (reduced) stake, and a separate larger figure is
   needed to defend the current stake. Probably both.
6. **Bid reduction safe-zone** — "as long as you're still winning,
   reducing your bid doesn't trigger the penalty." Currently the
   Bid-Too-Low Penalty section just states the rule; doesn't give the
   operational intuition that validators need.

Items 1-3 are pure GUIDE additions. Item 4 likely needs a small UI
component (epoch lifecycle indicator). Item 5 is both UI label and
GUIDE explanation. Item 6 is one extra sentence in the Bid-Too-Low
section.

## Tip engine: handle all 6 SDK constraint types

`tip-engine.ts:getValidatorTip` currently emits only `bond | rank |
bid | none`. The SDK exposes six `AuctionConstraintType`s via
`validator.lastCapConstraint?.constraintType`, and we ignore four
of them. A validator at target due to a cap they cannot influence
gets misleading "At target stake" or no actionable advice at all.

| Type | Meaning | Validator action | Our coverage |
|---|---|---|---|
| BOND | Bond too small | Top up | handled |
| RISK | Backstop / unprotected stake cap | Top up bond | handled (cascades into bond CTA) |
| WANT | Self-imposed `maxStakeWanted` cap | Raise `maxStakeWanted` | **missing** |
| VALIDATOR | Protocol-level per-validator cap (`marinadeValidatorStakeCapSol`) | Nothing | **missing** — should at least acknowledge so user stops trying |
| COUNTRY | Per-country concentration cap | Nothing direct | **missing** |
| ASO | Per-ASO concentration cap | Nothing direct | **missing** |

What to add:

- WANT branch in `getValidatorTip`: when in set, delta ≤ 0 or near
  zero, and `lastCapConstraint.constraintType === 'WANT'`, emit a
  CTA like "You're at your max-stake-wanted (`{N}` SOL). Raise it to
  qualify for more." with `constraint: 'want'`.
- VALIDATOR / COUNTRY / ASO branch: when the cap is none of the
  actionable ones, emit an explanatory tip ("Stake limited by the
  protocol's per-validator / country / ASO cap — nothing you can
  do this epoch") with a new `constraint: 'protocol'` (or expose as
  `'none'` with a more specific text). Goal is to stop validators
  chasing fixes that won't help.
- Extend `TipConstraint` type: `'rank' | 'bond' | 'bid' | 'want' |
  'protocol' | 'none'`.
- GUIDE `Next Step` bullet list (already updated to mention WANT)
  should also list the protocol-cap case.

References:
- `src/services/tip-engine.ts:168-275` (getValidatorTip)
- SDK `node_modules/@marinade.finance/ds-sam-sdk/dist/src/constraints.js:130-179`
- `src/services/sam.ts:365` (we already read `lastCapConstraint` for
  the concentration cards)

## Test fixtures: full /test- CTA + auction-state coverage

`/test-` runs the REAL `DsSamSDK` auction over
`src/fixtures/test-validators.ts`, so many CTA states are EMERGENT from
the auction (rank / "bid too low", "losing stake next epoch",
gain-stake, country/ASO caps) — they cannot be set per-field. The
fixture must be a coherent validator population, or a pruned frozen
real snapshot, large and varied enough that the auction itself
produces every region.

Approach — pick the pragmatic one:
- (A) Trace each CTA state to the auction outcome that produces it,
  then construct a tuned population (dozens of rows) with realistic
  PMPE / stake / country / ASO / bond distributions.
- (B) Capture ONE real snapshot from the live data source
  (`src/services/sam.ts` loadSam / `src/services/validators.ts`),
  freeze it as a static fixture — NO runtime upstream, `/test-` is
  sealed (commit 4ecee874) — prune to a representative subset, tune a
  few edge rows. B-frozen is best: realistic + deterministic + offline.

Must vary across rows: **bid (cpmpe), bond balance, active stake,
paid undelegation, and claimable-bond vs gross-bond** (rows where
claimable < gross).

Must produce these auction CONDITIONS, not just per-field states:
- Non-zero **redelegation budget** — `selectRedelegationBudget` =
  max(0, TVL − Σactive) > 0. Without it NO stake activates, so
  "raise bid to gain/keep stake", in-auction-target and
  next-epoch-stake are completely untestable. Fixture total TVL must
  exceed Σ active stake (supply side); paid-undelegation no longer
  recycles into the budget under the current `sam.ts` model — verify
  at implementation time.
- A clearing cutoff with winners AND losers so rank ±N, the
  contiguous out-of-set "bid too low" block, and "losing stake next
  epoch" all arise.
- Enough validators sharing one country / ASO to hit a concentration
  cap.
- Bond tiers: healthy / soft / watch / critical / no-bond; risk-fee
  outstanding; top-up-to-avoid-fee pending; carried paid undelegation.

Constraints: write only `src/fixtures/**` and the `/test-` wrapper if
strictly needed; fixture objects must satisfy the existing
AuctionValidator-derived types exactly. Verify with
`pnpm build && pnpm preview` → open `/test-`, list which CTA /
auction state each named row surfaces.

## CTA family: action + quantified consequence

Unify the whole bond/stake CTA family on one shape — **a plain action
verb, an amount, and the real consequence with its number**. Replace the
unquantified weak forms ("to qualify", "to win stake", bare "Losing N
SOL next epoch.") everywhere they appear: the sam-table pill,
validator-detail, and the breakdown banner must read identically for a
given state, sourced from the canonical `bondAdvice()` in `tip-engine.ts`.

The consequence half must match the state — it is **not** always "lose
stake":

| State | CTA shape | Number source |
|---|---|---|
| Holds stake, bond below min / Critical (clips to 0) | `Top up N SOL or lose {stake} SOL.` | top-up: `computeBondCoverage`; stake: row delta |
| No stake yet, wants in (nothing to lose) | `Top up N SOL to win {stake} SOL.` | upside framing — carrot, no "or lose" |
| Bond thin, risk fee imminent | `Top up N SOL or pay a ~{fee} SOL fee.` | fee: `computeBondCoverage` risk-fee |
| Stake shrinks, cause = lost on price (bid) | `Raise bid or lose {stake} SOL.` (unquantified action) | see bid caveat below |

Bond-side numbers all already exist (`computeBondCoverage` — same figures
the Bond tab uses). The bid-side number does **not**:
`computeInAuctionTarget` / `computeNextEpochStake` estimate bid-to-clear
but are caveated — "estimate, verify in Simulate", last-price coupling.
Until those are trusted for a headline CTA, the bid-cause row keeps the
action unquantified (`Raise bid …`) while still naming the `{stake}`
consequence — never a bare "Losing N" with no remedy. Wiring a quoted
`Raise bid by N` is the deferred follow-up (confirm estimate reliability
or gate it behind Simulate).

Touches: `src/services/tip-engine.ts` (`bondAdvice()` and the `Losing`
branch ~line 326 — route by cause), `computeBondCoverage` for top-up /
fee numbers, `in-auction-target.ts` / `next-epoch-stake.ts` for the bid
estimate once trusted.

## UI: Bond health gauge — critical zone too small, decoupled from marker

**Diagnosed root cause.** The bond gauge call site
(`sam-table.tsx:803-810`) passes `scaleMax={100}`,
`marker={minBondEpochs / 100}`, `criticalBand={0.25}`. With the SDK
default `minBondEpochs = 1`, the threshold marker lands at
`1/100 = 1%` (clamped to 2% by the Gauge's display floor) — a sliver
nobody can read — while the faint-red `criticalBand` is a hardcoded
**25%** that corresponds to nothing (25 epochs on a 0–100 scale). The
band and the marker disagree, and the meaningful danger region is ~2%
of the bar instead of a visible zone.

**Required behaviour.** The critical zone should occupy **~20%** of
the bar, the threshold marker should sit at that same 20% line, and
the red band must equal the below-threshold region (band == marker, no
hardcoded constant). Concretely: rescale so the threshold lands at the
chosen visible fraction — `scaleMax = minBondEpochs / 0.20` (= 5 ×
`minBondEpochs`), then `marker = minBondEpochs / scaleMax = 0.20` and
`criticalBand = minBondEpochs / scaleMax = 0.20`. A validator at 1×
`minBondEpochs` runway sits exactly on the line; the healthy range
(1×–5×) spans 20%–100%. Band, marker, and fill all then derive from
one scale and can never contradict.

**Also (original asks, still valid):** keep the threshold tick visible,
and make the below-limit state dramatic (empty bar + colour alone is
missable in a long table) — a solid over-limit strip or alert icon.

Touches:
- `src/components/sam-table/sam-table.tsx:803-810` (the Gauge call —
  scaleMax / marker / criticalBand all become functions of
  `minBondEpochs`).
- `src/components/gauge/gauge.tsx` only if the over-limit dramatic
  state needs a new rendering mode beyond the existing band/marker.

Blocked: `sam-table.tsx` is under another agent's edit; do after it
frees. Don't hardcode `0.25` again — derive everything from the scale.

## Bond breakdown: forward-looking ideal bond for SOFT + growing validators

The Bond tab's "Ideal bond to grow stake" section sizes its `requiredIdealKeep`
against `currentExposedStakeSol` — fine for a validator at steady state, but
WRONG for a SOFT-bond validator who is *gaining* stake next epoch. They need to
pre-fund the bond for the stake that's about to arrive, not for what they hold
today. Currently the row tells them "top up N SOL" where N is sized for current
stake; the real ask is sized for `marinadeSamTargetSol`.

**Where:** `src/services/bond-coverage.ts` (computes `requiredIdealKeep` and
`topUpToIdealKeep`), `src/components/breakdowns/bond-coverage.tsx` (renders the
"Ideal bond to grow stake" section). Likely add a parallel `requiredIdealAtTarget`
+ `topUpToIdealAtTarget` pair sized against `auctionStake.marinadeSamTargetSol`
(or `marinadeActivatedStakeSol + expectedStakeChangeSol`), only surfaced when
positive delta is expected.

**Design call needed before coding:**
- (a) NEW row alongside existing ideal (current vs projected side-by-side)
- (b) REPLACE the current "Ideal" row with the projected version when delta > 0,
  reverting to current-stake basis at steady state
- (c) Single row that picks max(current, projected) so the recommendation is
  always defensive

**Why:** transcripts surfaced operators reading the existing "Top up N SOL"
recommendation as "to keep my current stake" when it was actually sized for
projected stake. Both numbers exist; surfacing only one of them confuses readers.

## Docs hygiene: enforce ≤120-char line length across GUIDE / SCREENS / VISUALS / ARCHITECTURE / README / TODO

Wisdom rule in `~/.claude/skills/wisdom/SKILL.md`: prose lines wrap at ≤120
chars (most code follows the same width). Several root docs and
`public/docs/GUIDE.md` have long-form prose lines that exceed this — notably
GUIDE.md's "Data Sources" table (lines ~22-25 are 200+ chars), the
participation-requirements bullet at line 119, and any markdown table that
includes long URLs.

**What to do** when the tree is clean:
- Walk every line in `public/docs/GUIDE.md`, `public/docs/GUIDE-EXPERT.md`,
  `SCREENS.md`, `VISUALS.md`, `ARCHITECTURE.md`, `README.md`, `TODO.md`,
  `CLAUDE.md`, and `bugs.md`.
- Wrap prose lines at ≤120 chars. Don't break mid-link or mid-codespan.
- Markdown tables with long URLs: either pin the URLs in a footnote
  reference (`[1]: https://…`) and use the short reference at the cell, or
  accept the table as the one exception (consistent with how most projects
  treat tables) and document the exception in CLAUDE.md.
- Don't reformat code blocks inside docs — those follow the language's own
  width rule.

**Why:** consistent width = clean diffs, easy review, and the rule is
already in wisdom — the docs just drifted.

## Simulation: pre-fill inputs from the breakdown's suggested values

Today the sim panel opens with the validator's current commissions/bid as the
defaults. The breakdown cards already compute concrete suggestions —
`computeInAuctionTarget.targetBidPmpe` ("the bid that clears the winning
total"), `computeNextEpochStake.targetBidPmpePriority` ("the bid that clears
the priority frontier"), the bond coverage's `topUpToKeepStake` / `topUpToAvoidFee`
— and each card has a "Simulate →" CTA. Clicking "Simulate →" should pre-fill
the panel with the suggested values so the user lands inside the panel ready
to evaluate the recommendation, not at their current state.

**Per CTA, which fields to pre-fill:**

- Bidding "Get into the auction" CTA → set bid to `inAuction.targetBidPmpe`.
- Bidding "Next epoch stake" CTA → set bid to `nextEpoch.targetBidPmpePriority`.
- Bond "Top up to keep stake" → set bond to `bondBalanceSol + topUpToKeepStake`.
- Bond "Top up to avoid the fee" → set bond to `bondBalanceSol + topUpToAvoidFee`.
- Bid-penalty "Raise bid in sim →" → set bid to `metrics.adjustedLimit` (the
  threshold the breakdown already labels as the safe bid).
- Payments "Simulate" → no specific suggestion, use current state (existing
  behaviour stays).

**Wiring:** `onGoToSim` callback today takes no arguments — extend it to
accept an optional `{ bid?, bond?, infl?, mev?, blk? }` and have each
breakdown pass the relevant suggestion. The sim panel then seeds its
controlled inputs from those values when present, falls back to current.

**Why:** the existing "Simulate →" affordance is a navigation, not a
recommendation. Pre-filling closes the loop — the user can immediately tweak
the suggestion and see what shifts instead of having to read the breakdown,
remember the number, and re-type it.

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

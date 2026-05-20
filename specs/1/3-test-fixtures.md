---
status: planned
---

# Test fixtures — full /test- CTA and auction-state coverage

**Why:** `/test-` runs the REAL `DsSamSDK` auction over
`src/fixtures/test-validators.ts`, so most CTA states are emergent from the
auction result — they cannot be set per field. The current fixture population
does not produce every region, so Playwright snapshots miss entire code paths.

## Why "B-frozen" (real snapshot) beats a hand-crafted population

A hand-crafted population (Option A) requires modelling the full auction
interactions — country/ASO caps, multiple winning bands, natural-withdrawal
budget — which is re-implementing the SDK. A pruned real snapshot (Option B) is
realistic, already exercised by the SDK, and deterministic once frozen.

Capture from the live data source (`loadSam` / `fetchValidatorsWithEpochs`),
freeze as a static fixture, prune to a representative subset (~30–50 rows), tune
a few edge rows.

## Auction conditions the fixture must produce

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

## Row variation required

Each fixture row must vary: `cpmpe`, bond balance, active stake, paid
undelegation, and claimable-bond vs gross-bond.

## Constraints

Write only `src/fixtures/test-validators.ts` (and `src/fixtures/test-bonds.ts`
if the bonds page needs parallel coverage). Fixture objects must satisfy the
existing `AggregatedValidator`-derived types exactly. Verify with
`pnpm build && pnpm preview` → open `/test-` and audit which CTA / auction
state each named row surfaces.

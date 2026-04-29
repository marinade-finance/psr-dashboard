# SDK Wishlist — Dashboard Simplification

Fields and APIs the `ds-sam-sdk` should ship so the dashboard stops
reconstructing them. Grouped by where the duplication lives today.

## Per-validator fields (`AuctionValidator` / `values`)

1. **`expectedNextEpochStakeChangeSol`** — replaces
   `services/sam.ts::computeExpectedStakeChanges` (~80 LOC: natural-withdrawal
   allocation at 0.7%/epoch + greedy redelegation budget by `totalPmpe` +
   paid undelegation). Code already comments "Planned migration: move this
   whole block into ds-sam-sdk."
2. **`topUpToMinBondSol`** / **`topUpToIdealBondSol`** — replaces the floor /
   required math in `tooltips/bond-breakdown.ts` (`floorBase`,
   `requiredIdeal`, `topUpToMin`, `topUpToIdeal`).
3. **`projectedExposedStakeSol`** — net of carried `paidUndelegationSol`
   with this-cycle `freshBondRiskUndel` + `freshBidTooLowUndel` stripped.
   Dashboard reproduces this; comment cites SDK `calculations.js:94`.
4. **`carriedPaidUndelegationSol`** — the prior-epoch portion explicitly,
   so the dashboard doesn't have to reverse-engineer the fresh charge.
5. **`activatingStakeCostSol`** and **`activeChargeCostSol`** —
   pre-multiplied SOL amounts so the sam-active tooltip stops doing
   `pmpe * stake / 1000`.
6. **`bidTooLowPenaltySol`** / **`blacklistPenaltySol`** — already have
   `bondRiskFeeSol`; ship the other two as SOL values too. Dashboard does
   `stake * pmpe / 1000` in `renderPenaltyBadges`.
7. **`isNonProductive`** — codify the
   `bondObligationPmpe < effParticipatingBidPmpe * 0.9` heuristic in SDK.
8. **`infoName`** — ship validator display name on the auction result.
   Dashboard hits a separate `/validators` endpoint just to build
   `nameByVote`.
9. **`bondHealthBucket`** enum — RED/ORANGE/YELLOW/GREEN with canonical
   thresholds (currently 13 / 6 / 2 epochs hard-coded in dashboard's
   `bondHealthColor`).

## Auction-result aggregates

10. **`winningApy` / `projectedApy` / `idealApy`** (parametrised by
    `epochsPerYear`) — replaces `selectWinningAPY` / `selectProjectedAPY` /
    `selectIdealAPY`.
11. **`redelegationBudgetSol`** — `TVL − Σactive`. Trivial but should be a
    single canonical field.
12. **`actuallyUnprotectedStakeSol`** + **`targetProtectedPct`** — replaces
    `selectActuallyUnprotectedStake` / `selectTargetProtectedPct`.
13. **`concentrationBreakdown`** (by country, by ASO) with `atCap` flags
    and cap pcts — replaces `buildConcentrationBreakdown`.
14. **`epochsPerYear`** / **`epochDurationSeconds`** — kill the 11-epoch
    fetch in `fetchEpochsBundle` (~40 LOC) just to estimate epoch duration.

## Override / scenario API

15. **`bondTopUpSol` on `SourceDataOverrides`** — kills `runWithBondTopUp`
    (`services/sam.ts:189-212`) and the `DashboardOverrides` shim. Already
    flagged with `DASHBOARD_BOND_OVERRIDE` markers.
16. **First-class scenario runner** —
    `runScenario({ tvlMult, blockedValidators, ... })` returning a
    comparable `AuctionResult`. Dashboard currently pokes private
    `getAggregatedData` / `getAuctionConstraints` / `transformValidators` /
    `new Auction(...)` to do TVL ±10% and top-5 backstop. Brittle.
17. **Aggregate APY-diff helpers** — `tvlSensitivity({ delta })`,
    `validatorSetRemovalImpact(voteAccounts)` — so the dashboard doesn't
    need `selectTvlApyDiff` / `selectTargetApyDiff`.

## Labels / strings

18. **Canonical constraint label** — replaces
    `lastCapConstraintDescription` switch. SDK owns the constraint types;
    dashboard shouldn't be guessing the labels.

---

If 1–4 and 10–16 land, roughly 60% of `services/sam.ts`
(`computeExpectedStakeChanges`, `computeNaturalWithdrawal`,
`augmentAuctionResult`, the APY helpers, concentration breakdown,
redelegation budget, unprotected math, bond top-up shim) and most of
`bond-breakdown.ts::computeBondMetrics` would dissolve.

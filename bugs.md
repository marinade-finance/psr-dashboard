# Bugs

Review queue. Only open items. Each entry: short title, source file:line, what's wrong, expected behavior. Fixes happen only when explicitly asked.

## 1. `rewardsGuaranteeIdeal` does not scale with the ideal window

- **Where:** `src/services/bond-coverage.ts` (computes `rewardsGuaranteeIdeal`)
- **Symptom:** the "Bond held for reward payouts" row in the **Ideal bond to grow stake** section shows the same value as in the **Minimum bond to keep stake** section (one epoch of rewards).
- **Expected:** the ideal reserve should scale with `idealEp` epochs, the same way `heldForBidIdeal` already does for the bid component. The tooltip ("across the longer ideal window") describes this expected behavior — the code does not implement it. Either the code is wrong, or the design intent for the reward reserve was always single-epoch and the tooltip is misleading. Confirm with protocol/spec which is right.
- **Audit ref:** breakdown audit 2026-05-19.

## 5. Bond top-ups use inconsistent bases (claimable vs gross)

- **Where:** `src/services/bond-coverage.ts:111` vs `:119`
- **Symptom:** `topUpToKeepStake` is computed against `claimableBondBalanceSol` (line 111) and the UI row at `bond-coverage.tsx:204` displays `claimableBondBalanceSol`. `topUpToIdealKeep` is computed against gross `bondBalanceSol` (line 119) and the UI at `bond-coverage.tsx:251` displays gross. Same-section, different bases — a validator whose bond is locked in pending operations sees a "keep stake" shortfall but an "ideal" surplus, or vice versa, with no UI signal of the basis switch.
- **Expected:** pick one basis for both calculations or surface the distinction in copy ("claimable now" vs "owned"). The protocol presumably charges against claimable, so likely both should use claimable; the ideal target is currently more permissive than the keep target, which is the opposite of intent.
- **Audit ref:** bug-hunt sweep 2026-05-19.

## 6. `marginalWinner` overwrite loses the cheapest in-set validator

- **Where:** `src/services/sam.ts` around `selectWinningApyForValidator` / `marginalWinner` resolution (loop walking validators sorted by `revShare.totalPmpe` desc)
- **Symptom:** marginalWinner is assigned for every in-set validator the loop visits, so it ends up holding the _lowest-totalPmpe_ in-set validator (last one seen in desc order). When there are zero in-set validators, marginalWinner stays null and `winningBidPmpe` defaults to 0 — `selectProjectedAPY` then under-estimates by one bid component. Worth confirming the empty-set path is actually unreachable in production (TVL > 0 implies someone is in-set), but the silent zero-fallback is fragile if not.
- **Expected:** either assert at least one in-set validator before computing APY, or fall back to the clearing-price PMPE explicitly.
- **Audit ref:** bug-hunt sweep 2026-05-19.

## 7. `allocateRedelegation` ignores SDK constraints (country / ASO / concentration caps)

- **Where:** `src/services/sam.ts` (`allocateRedelegation`, the local greedy budget pass that powers `selectRedelegationPriorityFrontierPmpe` / `selectRedelegationPriorityRank` / `computeNextEpochStake`)
- **Symptom:** the greedy pass walks validators by `totalPmpe desc` and allocates budget with zero enforcement of country / ASO / single-validator caps. The SDK's `auction.evaluate()` applies these caps via `AuctionConstraints` after stake distribution, and _will_ reject allocations the local pass made. Comment near the top claims estimates "never drift apart" from SDK — caps are a known source of drift.
- **Expected:** either enforce the same constraints in the local pass, or update the comment + the "Table B" caveat to say "estimate assumes no cap binds for this validator." Capped-out validators currently see misleadingly attractive next-epoch numbers.
- **Audit ref:** bug-hunt sweep 2026-05-19.

## 8. Bond CTA hides Cap CTA when both fire

- **Where:** `src/services/tip-engine.ts` `selectTip` and the cascade producing `bondCta` / `bidCta` / `capCta` / `deltaCta`
- **Symptom:** `selectTip` picks the single highest-urgency candidate by `LEVER_ORDER`. `deltaCta` has explicit mutual exclusion at source (commented). `capCta` does not — a validator hitting both a bond fee (critical) and a cap (info) only ever surfaces the bond tip; the cap explanation vanishes. This is reasonable for the header chip but a user comparing rows can't tell whether a capped validator still has a cap issue or only a bond issue.
- **Expected:** either make cap mutually exclusive with bond at source (and document it), or carry a secondary tip slot so the validator-detail panel can list both. The current state silently picks one.
- **Audit ref:** bug-hunt sweep 2026-05-19.

## 9. bond-coverage.ts: `freshBidTooLowUndel` stake-base mismatch

`bond-coverage.ts` derives `freshBidTooLowUndel` against `marinadeActivatedStakeSol`. Refine review flagged that the SDK's `calcBidTooLowPenalty` (auction.js:201 → calculations.js) applies the penalty against the **post-undelegation projected base**, not the raw activated stake — so subtracting this from `paidUndelegationSol` to derive `carriedPaidUndelegationSol` may over-subtract and push `projectedExposedStakeSol` artificially low, making `topUpToAvoidFee` read lower than the SDK actually requires (masking a genuine fee risk).

Verification needs access to ds-sam-sdk source in `node_modules`. Add unit test against a fixture with known carried + fresh undelegation breakdown before changing the formula. (Note: #13 simulation-staleness fix in this area is already landed — bond-coverage now routes through `computeBidPenalty(...).penaltyPmpe` so sim edits propagate. The stake-base question is independent.)

## 10. allocateRedelegation sorts stakePriority descending

- **Where:** `src/services/sam.ts:289-291`
- **Symptom:** `sorted = [...validators].sort((va, vb) => vb.stakePriority - va.stakePriority)` walks validators worst-first. SDK assigns stakePriority ascending (1 = best). Inverts rank, frontier, inflow, and marginalWinner downstream.
- **Expected:** `va.stakePriority - vb.stakePriority` (asc). Sibling to bug #6 but a separate sort site. User flagged this previously and said "0=best correct" — needs a definitive SDK trace before flipping.

## 11. Simulation result overwrites the live `['sam']` cache

- **Where:** `src/pages/stake-auction-marketplace.tsx:99-101` (mutation onSuccess: `queryClient.setQueryData(['sam'], result)`)
- **Symptom:** Sim runs (and `/test-*` injected data) blow away the canonical SAM cache. Any consumer that calls `ensureQueryData({ queryKey: ['sam'] })` mid-sim (e.g. `validator-with-bond.ts:50`) gets the sim numbers under the live banner. A background refetch can flip the table back to live data under the sim banner.
- **Expected:** Keep sim data in a separate state/cache key; render the table off whichever the page chose, leaving `['sam']` untouched.

## 12. `fetchValidatorsWithEpochs` filters zero-stake validators

- **Where:** `src/services/validators.ts:52-56`
- **Symptom:** filters out any validator with both `marinade_stake == 0` AND `marinade_native_stake == 0`. A validator who first wins stake next epoch has zero current stake and is dropped from `fetchValidatorsWithBonds`, so they don't appear on `/bonds` (rows or search), and bond pages miss new winners entirely.
- **Expected:** drop the filter, or take the union with the auction's in-set validators before filtering.

## 14. Redelegation budget consumed by sub-min-bond validators

- **Where:** `src/services/sam.ts:309-322` (`allocateRedelegation`)
- **Symptom:** the greedy pass walks every validator regardless of `bondBalanceSol < minBondBalanceSol`. Sub-min-bond validators get allocated inflow that is then dropped in `computeExpectedStakeChanges` ("Sub-min-bond validators lose all stake and are excluded from inflow/rotation"). Budget that healthy validators should have received is silently consumed.
- **Expected:** skip `bondBelowMin(v)` validators in the greedy pass before consuming `remaining`. Mirror the exclusion that `computeExpectedStakeChanges` applies.
- **Complication:** `allocateRedelegation` is memoised via `WeakMap<AuctionResult, …>` keyed on auction result alone. To enforce the skip, the fn must also accept `minBondBalanceSol` and the cache key must become compound. Not a one-line fix.

## 26. `tsconfig.json` includes Playwright specs in tsc scope

- **Where:** `tsconfig.json:24` (`"include": ["src/**/*", "tests/**/*"]`)
- **Symptom:** Playwright specs live in `tests/**`, but the project's `tsconfig` doesn't declare `@playwright/test` types. `tsc --noEmit` either errors or relies on ambient hoisting.
- **Expected:** separate `tests/tsconfig.json` with `@playwright/test` types; drop `tests/**` from the root include (or move to a project reference). Build-config decision.

## 28. `generate-schemas.sh`: unpinned `npx`, undeclared `python3`

- **Where:** `scripts/generate-schemas.sh:23,49`
- **Symptom:** `npx openapi-zod-client` fetches whatever version is local-or-current at run time. Line 23 runs `python3` inline — neither documented in README nor declared as a dependency.
- **Expected:** use `pnpm exec openapi-zod-client` (or pin the version), and document the `python3` dependency in README / require it from a Node helper. Build-process decision.

## 29. SPA fallback `!url.includes('.')` misroutes dotted paths

- **Where:** `vite.config.ts:21-25`
- **Symptom:** any future route containing a `.` (vote account with a period, settled-epoch slug, etc.) is treated as a static asset and skipped by the SPA fallback → 404 in dev/preview. No current route uses dots, so latent.
- **Expected:** swap the "no dot" heuristic for an explicit static-extension allow-list (`.css`, `.js`, `.json`, `.png`, …).

## 33. `validator-with-bond.ts` drops abort signal

- **Where:** `src/services/validator-with-bond.ts:43-51`
- **Symptom:** the outer function accepts `signal?: AbortSignal` and forwards it to `fetchValidatorsWithEpochs` and `fetchBonds`, but the `ensureQueryData` call falls back to `() => loadSam()` with no signal. A cancellation never reaches the SAM fetch.
- **Complication:** `loadSam()` (sam.ts:29) is currently `(): Promise<SamResult>` with no signal parameter, and calls `dsSam.runFinalOnly()` — the SDK API probably doesn't accept a signal either. Forwarding requires a `loadSam` signature change, an SDK-level signal hookup, and updates at two other call sites (`epoch-meter.tsx:27`, `validator-with-protected_event.ts:40`).

## 34. Simulation "what if" panel: field changes don't update displayed values

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/validator-detail/validator-detail.tsx` — Simulate tab inputs; `src/pages/stake-auction-marketplace.tsx` — `handleDetailSimulate` / `runSimulation`
- **Symptom:** user changed commission / bid fields in the Simulate tab and saw no value change. May be a trigger issue (sim only fires after all fields have been touched), a stale-data issue (mutation writes to `['sam']` but the detail panel reads a derived value that isn't recomputed), or a UI state bug where the inputs appear editable but the sim doesn't re-run.
- **Expected:** changing any sim input and submitting/blurring causes a re-run and updates all downstream values visibly.
- **Note:** may overlap bug #11 (sim overwrites live cache) or the `firstRun.current` reset fix in 8624611f. Needs live reproduction before diagnosing.

## 35. Protected events table: column headers drift on scroll

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/protected-events-table/protected-events-table.tsx` — table header sticky positioning
- **Symptom:** column headers shift horizontally when scrolling down the protected events table. Likely a sticky `thead` with a misaligned offset, or the header row not being in a fixed container while the body scrolls.
- **Expected:** headers stay fixed at the top and horizontally aligned with their columns at all scroll positions.

## 36. Bond coverage gauge is hard to read

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/validator-bonds-table/` — bond tier gauge / coverage bar
- **Symptom:** the multi-segment coverage bar uses narrow colored bands that are visually dense and hard to distinguish, especially for thin segments. Screenshot shows bands nearly indistinguishable at a glance.
- **Expected:** clearer visual treatment — wider segments, better contrast, or replace with a simpler indicator (single-color fill + threshold marker). Design decision needed.

## 37. Search input clipped in compact mode

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/sam-table/sam-table.tsx` — search/filter bar layout in compact mode
- **Symptom:** "Find validator by name c" appears cut off on the right in compact mode. The input or its container overflows and clips rather than shrinking or wrapping.
- **Expected:** search input remains fully readable and usable regardless of compact/full toggle state.

## 38. Protected events table shows duplicate entries without flagging them

- **Source:** Yutaro/DawnLabs feedback 2026-05-28 (Discord)
- **Where:** `src/components/protected-events-table/protected-events-table.tsx`
- **Symptom:** epoch 977 shows two identical rows per validator (same vote account, same epoch, same amount, same reason — e.g. two "Bidding ◎2.227 Validator" rows). Backend confirmed a protocol-level duplicate settlement bug ("team is on it, no settlement yet"). The dashboard renders both rows silently.
- **Expected:** detect duplicate `(vote_account, epoch, reason, amount)` tuples in the incoming data and surface a visual warning (e.g. a yellow "duplicate" badge or a banner) so users know the double-billing is a known backend issue, not two separate events. Do not silently deduplicate — the data should be visible but flagged.
- **Note:** fix depends on the backend resolving the root cause. Dashboard change is defensive UX only.

## 41. `passesTableFilter` excludes validators with target stake but no active stake and no bond

- **Where:** `src/components/sam-table/sam-table.tsx:166` (`passesTableFilter`)
- **Symptom:** the gate `if (!hasActiveStake && !meetsMinBond) return false` excludes validators
  with `marinadeActivatedStakeSol = 0` AND `bondBalanceSol < minBondBalanceSol`. This is too
  broad: a validator who has `marinadeSamTargetSol > 0` (about to receive stake, or in the auction
  winning set) but has not yet posted a bond is invisible in the table. Similarly, a validator who
  previously had stake, lost their bond, and has `marinadeActivatedStakeSol > 0` should still show.
  The original intent was to hide pure no-bond-no-stake noise; the fix was too aggressive.
- **Expected:** gate should be `!hasActiveStake && !hasTargetStake && !meetsMinBond` — only exclude
  validators with zero active stake, zero SAM target, AND no qualifying bond. Any validator with
  `marinadeActivatedStakeSol > 0` OR `marinadeSamTargetSol > 0` must remain visible regardless
  of bond state.
- **Fix:** change line 166 to also check `v.auctionStake.marinadeSamTargetSol > 0`; the return
  at line 168 already handles it correctly.

## 42. Generated Zod schemas are hand-edited — regeneration reverts fixes

- **Where:** `src/schemas/generated/validators.ts`, `src/schemas/generated/bonds.ts`
- **Symptom:** the committed generated files do NOT match a clean `pnpm generate-schemas` run, verified 2026-05-29 (the OpenAPI specs in `src/schemas/openapi/*.json` ARE 100% in sync with the live APIs — only the generated `.ts` drift). Two classes of drift:
  1. **Generator-version drift** (ties to #28, unpinned `npx`): committed files lack the `export const api = new Zodios(endpoints)` line and use a different operation alias (`'List commission change reports'` vs current `'List commission changes'`) — the committed files were generated by an older `openapi-zod-client` than `npx` resolves to now.
  2. **Manual hand-edits:** `bonds.ts` has `cpmpe: z.union([z.string(), z.number()])` (correct — live API returns a number, see commit `a36c7f4e`), `bond_type: z.string().optional()`, and an extra `z.object({}).passthrough()` — none reproducible from the spec.
- **Critical:** `cpmpe` in the live OpenAPI spec is still declared `string` while the API returns a number. Regenerating would revert the `cpmpe` union and `bond_type` optional edits → re-break the `/bonds` page (Zod parse throw → error panel).
- **Expected:** either (a) report the `cpmpe`/`bond_type` spec inaccuracies upstream so the OpenAPI spec matches reality and regeneration is faithful, or (b) move the manual patches out of the generated file into a hand-owned override layer (e.g. extend/merge in `src/services/bonds.ts`) so regeneration can't clobber them, and pin the generator version (#28). Until then, NEVER run `pnpm generate-schemas` without re-applying these edits.

## 39. Simulation panel number inputs don't respond to mouse wheel

- **Source:** user feedback 2026-05-29
- **Where:** `src/components/validator-detail/validator-detail.tsx` — Simulate tab inputs (bid PMPE, inflation commission, MEV commission, block rewards commission)
- **Symptom:** scrolling the mouse wheel over a numeric input in the simulation panel does not increment/decrement the value. Validators expect mouse-wheel to work as it does in most numeric inputs (e.g. browser native `<input type="number">` behaviour).
- **Expected:** mouse wheel up/down adjusts the focused input value by one step; modifier key (Shift?) increases the step size for coarser adjustment.

## 40. `topUpToKeepStake` oversized when `maxStakeWanted < marinadeActivatedStakeSol`

- **Source:** Sec3 user-test (Bug C)
- **Where:** `src/services/bond-coverage.ts:113` (`topUpToKeepStake`)
- **Symptom:** `stakeKeepFloor` is computed from `currentExposedStakeSol = marinadeActivatedStakeSol - unprotectedStakeSol`. When a validator has explicitly capped via `maxStakeWanted` below their current active stake, the "top up to keep stake" recommendation is sized for stake they've said they don't want. A validator at 100k active with `maxStakeWanted=50k` sees a top-up sized for 100k; the correct target is `min(currentExposedStakeSol, maxStakeWanted - unprotectedStakeSol)`.
- **Expected:** cap the `currentExposedStakeSol` stake base at `maxStakeWanted` (when set and < current active) so the keep-stake recommendation matches the validator's own target.
- **Note:** `maxStakeWanted` is not read anywhere in `bond-coverage.ts`. The field is available on `AuctionValidator`.

## 40. Bond breakdown "Bond held for bid payments" help text omits epoch multiplier

- **Source:** Sec3 user-test (Bug D — substantially improved but not fully resolved)
- **Where:** `src/components/breakdowns/bond-coverage.tsx` — `Bond held for bid payments` row help text
- **Symptom:** section header says "X epochs" and the row shows the resulting SOL amount, but the help text says "Bid times exposed stake over the covered window" — "the covered window" is vague and doesn't reference the epoch count. A user who wants to verify the arithmetic (`epochs × bid_rate × stake / 1000`) cannot do so from the UI alone.
- **Expected:** mention the epoch count in the help text, e.g. "Expected max effective bid × exposed stake × N epochs, plus a fixed reserve for the unprotected slice."

# Bugs

Review queue. Only open items. Each entry: short title, source file:line, what's wrong, expected behavior. Fixes happen only when explicitly asked.

## 1. `rewardsGuaranteeIdeal` does not scale with the ideal window

- **Where:** `src/services/bond-coverage.ts` (computes `rewardsGuaranteeIdeal`)
- **Symptom:** the "Bond held for reward payouts" row in the **Ideal bond to grow stake** section shows the same value as in the **Minimum bond to keep stake** section (one epoch of rewards).
- **Expected:** the ideal reserve should scale with `idealEp` epochs, the same way `heldForBidIdeal` already does for the bid component. The tooltip ("across the longer ideal window") describes this expected behavior — the code does not implement it. Either the code is wrong, or the design intent for the reward reserve was always single-epoch and the tooltip is misleading. **Needs protocol/spec confirmation before fixing.**
- **Audit ref:** breakdown audit 2026-05-19.

## 11. Simulation result overwrites the live `['sam']` cache

- **Where:** `src/pages/stake-auction-marketplace.tsx:99-101` (mutation onSuccess: `queryClient.setQueryData(['sam'], result)`)
- **Symptom:** Sim runs (and `/test-*` injected data) blow away the canonical SAM cache. Any consumer that calls `ensureQueryData({ queryKey: ['sam'] })` mid-sim (e.g. `validator-with-bond.ts:50`) gets the sim numbers under the live banner. A background refetch can flip the table back to live data under the sim banner.
- **Expected:** Keep sim data in a separate state/cache key; render the table off whichever the page chose, leaving `['sam']` untouched.
- **Note:** architectural — touches the core data flow through `SamPage`. May be the root cause behind #34.

## 14. Redelegation budget consumed by sub-min-bond validators

- **Where:** `src/services/sam.ts` (`allocateRedelegation`)
- **Symptom:** the greedy pass walks every validator regardless of `bondBalanceSol < minBondBalanceSol`. Sub-min-bond validators get allocated inflow that is then dropped in `computeExpectedStakeChanges`. Budget that healthy validators should have received is silently consumed in the frontier/rank accounting.
- **Expected:** skip `bondBelowMin(v)` validators in the greedy pass before consuming `remaining`. Mirror the exclusion `computeExpectedStakeChanges` applies.
- **Complication (traced 2026-05-29):** `minBondBalanceSol` lives only on `DsSamConfig`, not `AuctionResult`; `allocateRedelegation` is memoised via `WeakMap<AuctionResult, …>`. The skip requires threading `minBondBalanceSol` through 4 public selectors into `next-epoch-stake.ts`, `bidding.tsx`, `sam-table.tsx`, `validator-detail.tsx`, plus a compound cache key. Per-validator deltas are ALREADY correct (sub-min inflow dropped downstream) — only the frontier/rank budget is optimistic. Low impact, high blast radius.

## 33. `validator-with-bond.ts` drops abort signal

- **Where:** `src/services/validator-with-bond.ts:43-51`
- **Symptom:** the outer function accepts `signal?: AbortSignal` and forwards it to `fetchValidatorsWithEpochs` and `fetchBonds`, but the `ensureQueryData` call falls back to `() => loadSam()` with no signal. A cancellation never reaches the SAM fetch.
- **Complication:** `loadSam()` (sam.ts:29) has no signal parameter and calls `dsSam.runFinalOnly()` — the SDK API probably doesn't accept a signal. Forwarding requires a `loadSam` signature change, an SDK-level signal hookup, and updates at two other call sites (`epoch-meter.tsx:27`, `validator-with-protected_event.ts:40`). Effectively blocked on SDK support.

## 34. Simulation "what if" panel: field changes don't update displayed values

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/validator-detail/validator-detail.tsx` — Simulate tab inputs; `src/pages/stake-auction-marketplace.tsx` — `handleDetailSimulate` / `runSimulation`
- **Symptom:** user changed commission / bid fields in the Simulate tab and saw no value change.
- **Expected:** changing any sim input and submitting/blurring causes a re-run and updates all downstream values visibly.
- **Note:** needs LIVE REPRODUCTION before diagnosing. May overlap #11 (sim overwrites live cache). The debounced auto-recalc effect (validator-detail.tsx ~638) and the `['sam']` mutation are the suspects.

## 36. Bond coverage gauge is hard to read

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/validator-bonds-table/` — bond tier gauge / coverage bar
- **Symptom:** the multi-segment coverage bar uses narrow colored bands that are visually dense and hard to distinguish, especially for thin segments.
- **Expected:** clearer visual treatment — wider segments, better contrast, or a simpler indicator (single-color fill + threshold marker). **Design decision needed.**

## 38. Protected events table shows duplicate entries without flagging them

- **Source:** Yutaro/DawnLabs feedback 2026-05-28 (Discord)
- **Where:** `src/components/protected-events-table/protected-events-table.tsx`
- **Symptom:** epoch 977 shows two identical rows per validator (same vote account, epoch, amount, reason). Backend confirmed a protocol-level duplicate settlement bug ("team is on it, no settlement yet"). The dashboard renders both rows silently.
- **Expected:** detect duplicate `(vote_account, epoch, reason, amount)` tuples and surface a visual warning (badge/banner) so users know it's a known backend issue, not two events. Do NOT silently deduplicate. **Defensive UX only — depends on backend fixing root cause; design decision on how to flag.**

## 42. Generated Zod schemas are hand-edited — regeneration reverts fixes

- **Where:** `src/schemas/generated/validators.ts`, `src/schemas/generated/bonds.ts`
- **Symptom:** the committed generated files do NOT match a clean `pnpm generate-schemas` run (verified 2026-05-29; the OpenAPI specs in `src/schemas/openapi/*.json` ARE in sync with the live APIs — only the generated `.ts` drift). Generator-version drift (#28-adjacent: committed files lack `export const api = new Zodios(endpoints)`, use an older operation alias) + manual hand-edits (`cpmpe: z.union([z.string(), z.number()])`, `bond_type: z.string().optional()`, an extra `z.object({}).passthrough()`).
- **Critical:** `cpmpe` in the live OpenAPI spec is still declared `string` while the API returns a number. Regenerating reverts the `cpmpe` union → re-breaks the `/bonds` page.
- **Expected:** (a) report the `cpmpe`/`bond_type` spec inaccuracies upstream so regeneration is faithful, or (b) move the manual patches into a hand-owned override layer (extend/merge in `src/services/bonds.ts`) so regeneration can't clobber them. Until then, NEVER run `pnpm generate-schemas` without re-applying these edits. **Strategy decision needed (upstream vs override).**

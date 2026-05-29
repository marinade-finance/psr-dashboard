# Bugs

Review queue. Only open items. Each entry: short title, source file:line, what's wrong, expected behavior. Fixes happen only when explicitly asked.

## 11. Simulation result overwrites the live `['sam']` cache

- **Where:** `src/pages/stake-auction-marketplace.tsx:99-101` (mutation onSuccess: `queryClient.setQueryData(['sam'], result)`)
- **Symptom:** Sim runs (and `/test-*` injected data) blow away the canonical SAM cache. Any consumer that calls `ensureQueryData({ queryKey: ['sam'] })` mid-sim (e.g. `validator-with-bond.ts:50`) gets the sim numbers under the live banner. A background refetch can flip the table back to live data under the sim banner.
- **Expected:** Keep sim data in a separate state/cache key; render the table off whichever the page chose, leaving `['sam']` untouched.
- **Status:** being fixed (with #34) — history of the removed `['sam', simulationRunId]` key (commit 2c8765b6) under investigation.

## 34. Simulation "what if" panel: field changes don't update displayed values

- **Source:** user feedback 2026-05-29 (L, Discord)
- **Where:** `src/components/validator-detail/validator-detail.tsx` — Simulate tab inputs; `src/pages/stake-auction-marketplace.tsx` — `handleDetailSimulate` / `runSimulation`
- **Symptom:** user changed commission / bid fields in the Simulate tab and saw no value change.
- **Expected:** changing any sim input and submitting/blurring causes a re-run and updates all downstream values visibly.
- **Status:** being fixed with #11 (likely same root cause — the `['sam']` overwrite tangling write-back/read-back).

## 38. Protected events table shows duplicate entries without flagging them

- **Source:** Yutaro/DawnLabs feedback 2026-05-28 (Discord)
- **Where:** `src/components/protected-events-table/protected-events-table.tsx`
- **Symptom:** epoch 977 shows two identical rows per validator (same vote account, epoch, amount, reason). Backend confirmed a protocol-level duplicate settlement bug ("team is on it, no settlement yet"). The dashboard renders both rows silently.
- **Expected:** detect duplicate `(vote_account, epoch, reason, amount)` tuples and surface a visual warning (badge/banner) so users know it's a known backend issue, not two events. Do NOT silently deduplicate.

## 42. Generated Zod schemas are hand-edited — regeneration reverts fixes

- **Where:** `src/schemas/generated/validators.ts`, `src/schemas/generated/bonds.ts`
- **Symptom:** the committed generated files do NOT match a clean `pnpm generate-schemas` run (verified 2026-05-29; the OpenAPI specs in `src/schemas/openapi/*.json` ARE in sync with the live APIs — only the generated `.ts` drift). Generator-version drift (committed files lack `export const api = new Zodios(endpoints)`, use an older operation alias) + manual hand-edits (`cpmpe: z.union([z.string(), z.number()])`, `bond_type: z.string().optional()`, an extra `z.object({}).passthrough()`).
- **Critical:** `cpmpe` in the live OpenAPI spec is still declared `string` while the API returns a number. Regenerating reverts the `cpmpe` union → re-breaks the `/bonds` page.
- **Expected:** move the manual patches into a hand-owned override layer (extend/merge in `src/services/bonds.ts`) so regeneration can't clobber them, and pin the generator version. Also report the `cpmpe`/`bond_type` spec inaccuracies upstream.
- **Status:** being fixed (override-layer approach).

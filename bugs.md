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

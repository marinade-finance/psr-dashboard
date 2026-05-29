---
status: planned
---

# Test-page parity — /test- data path may diverge silently

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

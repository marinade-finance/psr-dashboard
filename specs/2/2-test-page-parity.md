---
status: shipped
---

# Test-page parity — /test- data path may diverge silently

**Why:** `/test-` routes wrap the same page components, so UI logic can't
silently diverge. What CAN diverge is the `loadAuction` / `loadNotifications`
implementation inside each test page — those are local reimplementations of the
real data loaders, not imports of them.

**Resolved:** the `hasOverrides` branch (the specific divergence risk) was removed
in `0487e348 [refactor] remove dead override path from loadSam`. The test page now
uses `dataSources?.loadAuction ?? loadSam` — the same null-coalesce the main page
uses. No bespoke branching remains.

**Where:** `src/pages/test-stake-auction-marketplace.tsx`,
`src/pages/stake-auction-marketplace.tsx`.

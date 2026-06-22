---
status: planned
---

# RedelegationAllocation — extract to own module, then to SDK

**Why:** `RedelegationAllocation` (the greedy inflow/frontier/rank result) lives in
`src/services/sam.ts` alongside unrelated data-loading and selector logic. The
allocation computation (`allocateRedelegation`) is a pure algorithm that belongs
in the SDK alongside `Auction.evaluate()`.

**Step 1:** extract `RedelegationAllocation`, `allocateRedelegation`, and its
selectors (`selectRedelegationBudget`, `selectRedelegationPriorityFrontierPmpe`,
`selectRedelegationPriorityRank`) into `src/services/redelegation.ts`.

**Step 2 (SDK):** move the algorithm to `ds-sam-sdk` once the SDK exposes the
greedy allocation as a named export; drop the local copy.

---
status: draft
---

# Ideal bond reward reserve — should it scale with the ideal window?

**Why:** in the bond coverage breakdown, the "Bond held for reward payouts"
row shows the SAME value in the **Ideal bond to grow stake** section as in the
**Minimum bond to keep stake** section (one epoch of rewards), while the bid
component (`heldForBidIdeal`) DOES scale up over the longer ideal window. The
ideal-section tooltip says "across the longer ideal window," which the code
does not implement — so either the code or the copy is wrong.

## Open question (blocked)

`rewardsGuaranteeIdeal` is currently set equal to `rewardsGuaranteeKeep`
(one epoch). Two possibilities:

- The reward reserve was always intended to be single-epoch (the protocol
  only ever guarantees one epoch of rewards) — then the **tooltip is wrong**
  and the fix is copy-only.
- The reserve should scale with `idealBondEpochs` like the bid component does
  — then the **code is wrong**.

This cannot be resolved from the dashboard alone — it needs confirmation of
protocol intent for the reward-delivery guarantee. **Blocked on protocol/spec
confirmation before any code or copy change.**

**Where:** `src/services/bond-coverage.ts` (`rewardsGuaranteeIdeal` vs
`rewardsGuaranteeKeep`); `src/components/breakdowns/bond-coverage.tsx`
("Bond held for reward payouts" row + tooltip).
